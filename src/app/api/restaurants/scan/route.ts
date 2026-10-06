import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { makeFunctionReference } from "convex/server";
import { NextRequest, NextResponse } from "next/server";
import { analyzeBravas, object, relevantReviews, ScanError, scannerConfiguration, serp, string } from "@/lib/restaurant-scanner";
import type { Id, Doc } from "../../../../../convex/_generated/dataModel";

export const maxDuration = 120;
type Work = { kind: "finished" | "busy" | "advance" } | { kind: "search"; area: string; offset: number }
  | { kind: "reviews"; area: string; target: Doc<"restaurantScanTargets"> };
const query = makeFunctionReference<"query">("restaurantScanner:status");
const mutation = (name: string) => makeFunctionReference<"mutation">(`restaurantScanner:${name}`);

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
  return NextResponse.json({ error: error instanceof ScanError ? error.message : "No se pudo acceder al escáner. Comprueba el despliegue de Convex y la plantilla JWT de Clerk" }, { status: error instanceof ScanError ? error.status : 503 });
}

export async function GET() {
  try { return NextResponse.json(await (await client()).query(query, {}), { headers: { "Cache-Control": "no-store" } }); }
  catch (error) { return failure(error); }
}

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin) return NextResponse.json({ error: "Origen no autorizado" }, { status: 403 });
  let convex: ConvexHttpClient | undefined;
  const lease = crypto.randomUUID();
  try {
    convex = await client();
    const status = await convex.query(query, {});
    if (!status.allowed) throw new ScanError("No autorizado", 403);
    scannerConfiguration();
    const work = await convex.mutation(mutation("acquire"), { lease }) as Work;
    if (work.kind === "busy") throw new ScanError("Ya hay un paso de escaneo en curso. Espera antes de reanudar", 409);
    const fetchSerp = async (parameters: Record<string, string>) => {
      await convex!.mutation(mutation("reserveRequest"), { lease });
      return serp(parameters);
    };
    if (work.kind === "search") {
      const data = await fetchSerp({ engine: "google_maps", type: "search", q: `restaurantes españoles bravas ${work.area} Madrid`,
        ll: "@40.4168,-3.7038,12z", start: String(work.offset) });
      const results = Array.isArray(data.local_results) ? data.local_results : [];
      const targets = results.flatMap(value => {
        const result = object(value), externalId = string(result.place_id), dataId = string(result.data_id);
        return externalId && dataId ? [{ externalId, dataId }] : [];
      });
      if (results.length && !targets.length) throw new ScanError("SerpAPI no devolvió identificadores de los locales. No se avanzó la búsqueda");
      await convex.mutation(mutation("saveSearch"), { lease, targets, hasNext: Boolean(string(object(data.serpapi_pagination).next)) });
    } else if (work.kind === "reviews") {
      const target = work.target;
      const data = await fetchSerp({ engine: "google_maps_reviews", data_id: target.dataId, sort_by: "newestFirst",
        ...(target.nextPage ? { next_page_token: target.nextPage, num: "20" } : {}) });
      if (!Array.isArray(data.reviews) && !string(data.error)) throw new ScanError("SerpAPI no devolvió una página de reseñas válida");
      const reviews = relevantReviews(data);
      const analysis = await analyzeBravas(reviews);
      let place: { name: string; address: string; latitude?: number; longitude?: number } | undefined;
      if (analysis.mentionCount > 0 && !target.placeId) {
        const details = await fetchSerp({ engine: "google_maps", type: "place", place_id: target.externalId });
        const result = object(details.place_results), gps = object(result.gps_coordinates);
        place = { name: string(result.title), address: string(result.address),
          ...(typeof gps.latitude === "number" ? { latitude: gps.latitude } : {}),
          ...(typeof gps.longitude === "number" ? { longitude: gps.longitude } : {}) };
        if (!place.name || !place.address) throw new ScanError("No se pudo recuperar el nombre y dirección del local con bravas");
      }
      const nextPage = string(object(data.serpapi_pagination).next_page_token);
      await convex.mutation(mutation("saveReviews"), { lease, targetId: target._id as Id<"restaurantScanTargets">, ...analysis,
        ...(nextPage ? { nextPage } : {}), ...(place ? { place } : {}) });
    }
    return NextResponse.json(await convex.query(query, {}), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof ScanError ? error.message : "Error guardando el paso en Convex. Avance conservado; revisa el despliegue";
    if (convex) try { await convex.mutation(mutation("fail"), { lease, error: message }); } catch {}
    return failure(error);
  }
}
