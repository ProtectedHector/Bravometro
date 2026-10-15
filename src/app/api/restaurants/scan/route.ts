import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { makeFunctionReference } from "convex/server";
import { NextRequest, NextResponse } from "next/server";
import { analyzeBravas, attributes, configuredGeminiModel, hasEnoughEvidence, object, relevantReviews, reviewPage, ScanError, scannerConfiguration, scannerFailure, serp, SerpApiQuotaError, string } from "@/lib/restaurant-scanner";
import type { Id, Doc } from "../../../../../convex/_generated/dataModel";
import { reviewPageSize } from "../../../../../convex/scanLimits";
import { DISCOVERY_QUERY_ROUNDS, type ScanArea } from "../../../../../convex/scanPlan";

export const maxDuration = 120;
type Work = { kind: "finished" | "busy" | "advance" } | { kind: "search"; area: ScanArea; offset: number; round: number }
  | { kind: "reviews"; area: ScanArea; target: Doc<"restaurantScanTargets"> }
  | { kind: "paused"; pausedUntil: number; pauseReason: "hourly" | "monthly" };
const query = makeFunctionReference<"query">("restaurantScanner:status");
const mutation = (name: string) => makeFunctionReference<"mutation">(`restaurantScanner:${name}`);

async function convexCall<Result>(operation: string, call: () => Promise<Result>): Promise<Result> {
  try { return await call(); }
  catch (error) {
    console.error("[Bravómetro] Convex scanner call failed", { operation, name: error instanceof Error ? error.name : typeof error, message: error instanceof Error ? error.message : String(error) });
    throw scannerFailure(error, `restaurantScanner:${operation}`);
  }
}

const scanStatus = (convex: ConvexHttpClient) => convexCall("status", () => convex.query(query, {}));
const scanMutation = (convex: ConvexHttpClient, name: string, args: Record<string, unknown>) => convexCall(name, () => convex.mutation(mutation(name), args));

async function client() {
  const { userId, getToken } = await auth();
  if (!userId) throw new ScanError("Debes iniciar sesión", 401);
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) throw new ScanError("Convex no está configurado", 503);
  let token: string | null;
  try { token = await getToken({ template: "convex" }); }
  catch { throw new ScanError("Clerk no pudo generar el JWT. Comprueba que exista una plantilla JWT llamada convex, con audience convex, en el Clerk de este entorno. Configura también CLERK_JWT_ISSUER_DOMAIN en Convex", 503); }
  if (!token) throw new ScanError("Configura la plantilla JWT convex en Clerk y CLERK_JWT_ISSUER_DOMAIN en Convex", 503);
  const convex = new ConvexHttpClient(url);
  convex.setAuth(token);
  return convex;
}

function failure(error: unknown) {
  const failure = scannerFailure(error);
  return NextResponse.json({ error: failure.message }, { status: failure.status });
}

export async function GET() {
  try { return NextResponse.json({ ...await scanStatus(await client()), geminiModel: configuredGeminiModel() }, { headers: { "Cache-Control": "no-store" } }); }
  catch (error) { return failure(error); }
}

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin) return NextResponse.json({ error: "Origen no autorizado" }, { status: 403 });
  let convex: ConvexHttpClient | undefined;
  let activeTargetId: Id<"restaurantScanTargets"> | undefined;
  const lease = crypto.randomUUID();
  const finishFailure = async (error: unknown) => {
    const normalized = scannerFailure(error);
    const message = normalized.message;
    const skipTarget = Boolean(activeTargetId) && ![401, 402, 403, 404, 429, 503].includes(normalized.status);
    if (convex) try {
      await scanMutation(convex, "fail", { lease, error: message, ...(activeTargetId ? { targetId: activeTargetId } : {}), ...(skipTarget ? { skipTarget: true } : {}) });
      if (skipTarget) {
        console.error(`[Bravómetro] ${activeTargetId} → ERROR tras retries → local omitido; continúa el lote`, error);
        return NextResponse.json({ ...await scanStatus(convex), warning: message }, { headers: { "Cache-Control": "no-store" } });
      }
    } catch {}
    return failure(error);
  };
  try {
    convex = await client();
    const status = await scanStatus(convex);
    if (!status.allowed) return failure(new ScanError("No autorizado", 403));
    scannerConfiguration();
    const work = await scanMutation(convex, "acquire", { lease }) as Work;
    if (work.kind === "busy") return failure(new ScanError("Ya hay un paso de escaneo en curso. Espera antes de reanudar", 409));
    if (work.kind === "paused") return NextResponse.json(await scanStatus(convex), { headers: { "Cache-Control": "no-store" } });
    const fetchSerp = async (parameters: Record<string, string>, targetId?: Id<"restaurantScanTargets">) => {
      await scanMutation(convex!, "reserveRequest", { lease, ...(targetId ? { targetId } : {}) });
      return serp(parameters);
    };
    if (work.kind === "search") {
      const roundQueries = DISCOVERY_QUERY_ROUNDS[work.round % DISCOVERY_QUERY_ROUNDS.length];
      const queryIndex = Math.min(Math.floor(work.offset / 20), roundQueries.length - 1);
      const data = await fetchSerp({ engine: "google_maps", type: "search", q: `${roundQueries[queryIndex]} ${work.area.searchLocation}` });
      const results = Array.isArray(data.local_results) ? data.local_results : [];
      const targets = results.flatMap(value => {
        const result = object(value), externalId = string(result.place_id), dataId = string(result.data_id), gps = object(result.gps_coordinates);
        return externalId && dataId ? [{ externalId, dataId, ...(string(result.title) ? { name: string(result.title) } : {}),
          ...(string(result.address) ? { address: string(result.address) } : {}),
          ...(typeof gps.latitude === "number" ? { latitude: gps.latitude } : {}),
          ...(typeof gps.longitude === "number" ? { longitude: gps.longitude } : {}) }] : [];
      });
      if (results.length && !targets.length) return finishFailure(new ScanError("SerpAPI no devolvió identificadores de los locales. No se avanzó la búsqueda"));
      await scanMutation(convex, "saveSearch", { lease, targets, hasNext: work.offset + 20 < roundQueries.length * 20 });
    } else if (work.kind === "reviews") {
      const target = work.target;
      activeTargetId = target._id as Id<"restaurantScanTargets">;
      const startedAt = Date.now();
      console.info(`[Bravómetro] ${target.externalId} → SerpAPI iniciado (consulta ${(target.serpRequests ?? 0) + 1})`);
      const data = await fetchSerp({ engine: "google_maps_reviews", data_id: target.dataId,
        ...(target.nextPage ? { next_page_token: target.nextPage, num: String(reviewPageSize(target.reviewCount ?? 0)) } : { sort_by: "qualityScore" }) }, target._id as Id<"restaurantScanTargets">);
      const page = reviewPage(data, Boolean(target.nextPage));
      const reviewCount = Array.isArray(page.data.reviews) ? page.data.reviews.length : 0;
      const reviews = relevantReviews(page.data);
      console.info(`[Bravómetro] ${target.externalId} → SerpAPI OK (${((Date.now() - startedAt) / 1000).toFixed(1)}s), ${reviewCount} reseñas obtenidas`);
      const geminiStartedAt = Date.now();
      console.info(`[Bravómetro] ${target.externalId} → análisis local/Gemini iniciado`);
      const analysis = await analyzeBravas(reviews);
      const accumulatedWeights = { ...target.weights };
      for (const key of attributes) accumulatedWeights[key] = (accumulatedWeights[key] ?? 0) + (analysis.weights[key] ?? 0);
      const useful = target.evidenceCount + analysis.evidenceCount;
      const enough = hasEnoughEvidence(useful, accumulatedWeights);
      const covered = attributes.filter(key => (accumulatedWeights[key] ?? 0) > 0).length;
      console.info(`[Bravómetro] ${target.externalId} → análisis local/Gemini OK (${((Date.now() - geminiStartedAt) / 1000).toFixed(1)}s), ${analysis.evidenceCount} reseñas útiles, ${covered}/10 aspectos con evidencia${enough ? ", suficiente evidencia → STOP SerpAPI" : ", información insuficiente"}`);
      let place: { name: string; address: string; latitude?: number; longitude?: number } | undefined;
      if (analysis.mentionCount > 0 && !target.placeId) {
        place = target.name && target.address ? { name: target.name, address: target.address,
          ...(target.latitude !== undefined ? { latitude: target.latitude } : {}), ...(target.longitude !== undefined ? { longitude: target.longitude } : {}) } : undefined;
        if (!place) {
          const details = await fetchSerp({ engine: "google_maps", type: "place", place_id: target.externalId }, target._id as Id<"restaurantScanTargets">);
          const result = object(details.place_results), gps = object(result.gps_coordinates);
          place = { name: string(result.title), address: string(result.address),
            ...(typeof gps.latitude === "number" ? { latitude: gps.latitude } : {}),
            ...(typeof gps.longitude === "number" ? { longitude: gps.longitude } : {}) };
        }
        if (!place.name || !place.address) return finishFailure(new ScanError("No se pudo recuperar el nombre y dirección del local con bravas"));
      }
      const nextPage = page.nextPage;
      await scanMutation(convex, "saveReviews", { lease, targetId: target._id as Id<"restaurantScanTargets">, reviewCount, ...analysis,
        ...(nextPage ? { nextPage } : {}), ...(place ? { place } : {}) });
    }
    return NextResponse.json(await scanStatus(convex), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (convex && error instanceof SerpApiQuotaError) {
      try {
        await scanMutation(convex, "pauseSerpapi", { lease, pauseReason: error.pauseReason });
        return NextResponse.json(await scanStatus(convex), { headers: { "Cache-Control": "no-store" } });
      } catch (pauseError) {
        console.error("[Bravómetro] No se pudo persistir la pausa de SerpAPI", pauseError);
      }
    }
    return finishFailure(error);
  }
}
