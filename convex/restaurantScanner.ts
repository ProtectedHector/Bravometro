import { v } from "convex/values";
import { mutation, query, type QueryCtx, type MutationCtx } from "./_generated/server";
import { SCAN_AREAS, SCANNER_USER_ID, SCANNER_VERSION } from "./scanPlan";
import { REVIEW_LIMIT, reviewLimitReached } from "./scanLimits";

async function permitted(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity || identity.issuer !== process.env.CLERK_JWT_ISSUER_DOMAIN) return false;
  const user = await ctx.db.query("users").withIndex("by_clerk_id", query => query.eq("clerkUserId", identity.subject)).unique();
  return user?._id === SCANNER_USER_ID;
}

async function authorize(ctx: QueryCtx | MutationCtx) {
  if (!await permitted(ctx)) throw new Error("No autorizado para escanear restaurantes");
}

async function state(ctx: QueryCtx | MutationCtx) {
  return ctx.db.query("restaurantScans").withIndex("by_key", query => query.eq("key", SCANNER_VERSION)).unique();
}

export const status = query({
  args: {},
  handler: async ctx => {
    if (!await permitted(ctx)) return { allowed: false };
    const scan = await state(ctx);
    return { allowed: true, area: SCAN_AREAS[scan?.areaIndex ?? 0] ?? "Finalizado", finished: scan?.finished ?? false,
      checked: scan?.checked ?? 0, imported: scan?.imported ?? 0, reviewPages: scan?.reviewPages ?? 0,
      requests: scan?.requests ?? 0, error: scan?.error ?? null };
  },
});

export const acquire = mutation({
  args: { lease: v.string() },
  handler: async (ctx, { lease }) => {
    await authorize(ctx);
    let scan = await state(ctx);
    if (!scan) {
      const scanId = await ctx.db.insert("restaurantScans", { key: SCANNER_VERSION, areaIndex: 0, searchOffset: 0,
        searchComplete: false, finished: false, checked: 0, imported: 0, reviewPages: 0, requests: 0, updatedAt: Date.now() });
      scan = (await ctx.db.get("restaurantScans", scanId))!;
    }
    if (scan.finished) return { kind: "finished" as const };
    if ((scan.leaseUntil ?? 0) > Date.now()) return { kind: "busy" as const };
    let target = await ctx.db.query("restaurantScanTargets").withIndex("by_areaIndex_and_status", query => query.eq("areaIndex", scan.areaIndex).eq("status", "pending")).first();
    if (target && target.reviewCount === undefined) {
      const pages = await ctx.db.query("restaurantScanPages").withIndex("by_targetId_and_page", query => query.eq("targetId", target!._id)).take(REVIEW_LIMIT / 20);
      const reviewCount = pages.reduce((count, page) => count + (page.reviewCount ?? 20), 0);
      await ctx.db.patch("restaurantScanTargets", target._id, { reviewCount });
      target = { ...target, reviewCount };
    }
    if (target && reviewLimitReached(target.reviewCount ?? 0, target.mentionCount)) {
      await ctx.db.patch("restaurantScanTargets", target._id, { status: "complete", nextPage: undefined, limitReached: true, updatedAt: Date.now() });
      await ctx.db.patch("restaurantScans", scan._id, { checked: scan.checked + 1, lease: undefined, leaseUntil: undefined, error: undefined, updatedAt: Date.now() });
      return { kind: "advance" as const };
    }
    if (!target && scan.searchComplete) {
      const areaIndex = scan.areaIndex + 1;
      await ctx.db.patch("restaurantScans", scan._id, { areaIndex, searchOffset: 0, searchComplete: false,
        finished: areaIndex >= SCAN_AREAS.length, error: undefined, updatedAt: Date.now() });
      return { kind: "advance" as const };
    }
    await ctx.db.patch("restaurantScans", scan._id, { lease, leaseUntil: Date.now() + 120000, error: undefined, updatedAt: Date.now() });
    return target ? { kind: "reviews" as const, target, area: SCAN_AREAS[scan.areaIndex] }
      : { kind: "search" as const, area: SCAN_AREAS[scan.areaIndex], offset: scan.searchOffset };
  },
});

async function owned(ctx: MutationCtx, lease: string) {
  await authorize(ctx);
  const scan = await state(ctx);
  if (!scan || scan.lease !== lease || (scan.leaseUntil ?? 0) < Date.now()) throw new Error("El paso de escaneo ha caducado; vuelve a intentarlo");
  return scan;
}

export const reserveRequest = mutation({
  args: { lease: v.string() },
  handler: async (ctx, { lease }) => {
    const scan = await owned(ctx, lease);
    await ctx.db.patch("restaurantScans", scan._id, { requests: scan.requests + 1 });
  },
});

export const saveSearch = mutation({
  args: { lease: v.string(), targets: v.array(v.object({ externalId: v.string(), dataId: v.string() })), hasNext: v.boolean() },
  handler: async (ctx, { lease, targets, hasNext }) => {
    const scan = await owned(ctx, lease);
    for (const target of targets.slice(0, 20)) {
      const existing = await ctx.db.query("restaurantScanTargets").withIndex("by_externalId", query => query.eq("externalId", target.externalId)).unique();
      if (!existing) await ctx.db.insert("restaurantScanTargets", { ...target, areaIndex: scan.areaIndex, status: "pending",
        mentionCount: 0, evidenceCount: 0, reviewCount: 0, totals: {}, weights: {}, updatedAt: Date.now() });
    }
    await ctx.db.patch("restaurantScans", scan._id, { searchOffset: scan.searchOffset + 20,
      searchComplete: !hasNext || scan.searchOffset >= 100, lease: undefined, leaseUntil: undefined, updatedAt: Date.now() });
  },
});

export const saveReviews = mutation({
  args: { lease: v.string(), targetId: v.id("restaurantScanTargets"), nextPage: v.optional(v.string()),
    reviewCount: v.number(), mentionCount: v.number(), evidenceCount: v.number(), totals: v.record(v.string(), v.number()), weights: v.record(v.string(), v.number()),
    place: v.optional(v.object({ name: v.string(), address: v.string(), latitude: v.optional(v.number()), longitude: v.optional(v.number()) })) },
  handler: async (ctx, args) => {
    const scan = await owned(ctx, args.lease);
    if (!Number.isInteger(args.reviewCount) || args.reviewCount < 0 || args.reviewCount > 20 || args.mentionCount > args.reviewCount) throw new Error("Cantidad de reseñas inválida");
    if (!Number.isInteger(args.mentionCount) || args.mentionCount < 0 || args.mentionCount > 20 || !Number.isInteger(args.evidenceCount) || args.evidenceCount < 0 || args.evidenceCount > args.mentionCount) throw new Error("Cantidad de evidencias inválida");
    const target = await ctx.db.get("restaurantScanTargets", args.targetId);
    if (!target || target.areaIndex !== scan.areaIndex || target.status !== "pending") throw new Error("Local de escaneo inválido");
    const page = target.nextPage ?? "first";
    const existingPage = await ctx.db.query("restaurantScanPages").withIndex("by_targetId_and_page", query => query.eq("targetId", target._id).eq("page", page)).unique();
    if (existingPage) throw new Error("La página de reseñas ya se procesó");
    if (args.nextPage) {
      const repeated = args.nextPage === page || await ctx.db.query("restaurantScanPages").withIndex("by_targetId_and_page", query => query.eq("targetId", target._id).eq("page", args.nextPage!)).unique();
      if (repeated) throw new Error("SerpAPI repite una página de reseñas. Escaneo detenido para evitar duplicados");
    }
    const mentionCount = target.mentionCount + args.mentionCount;
    const reviewCount = (target.reviewCount ?? 0) + args.reviewCount;
    const limitReached = Boolean(args.nextPage) && reviewLimitReached(reviewCount, mentionCount);
    const nextPage = limitReached ? undefined : args.nextPage;
    const evidenceCount = target.evidenceCount + args.evidenceCount;
    const totals = { ...target.totals }, weights = { ...target.weights };
    for (const key of ["overall", "potato", "sauce", "spiciness", "taste", "texture", "quantity", "value"]) {
      const total = args.totals[key] ?? 0, weight = args.weights[key] ?? 0;
      if (!Number.isFinite(total) || !Number.isFinite(weight) || weight < 0 || weight > args.evidenceCount || total < 0 || total > 10 * weight + 1e-9) throw new Error("Puntuación automática inválida");
      totals[key] = (totals[key] ?? 0) + total;
      weights[key] = (weights[key] ?? 0) + weight;
    }
    let placeId = target.placeId;
    let imported = false;
    if (mentionCount > 0 && !placeId) {
      const existing = await ctx.db.query("places").withIndex("by_external_place", query => query.eq("externalPlaceId", target.externalId)).first();
      if (existing) placeId = existing._id;
      else {
        if (!args.place?.name || !args.place.address) throw new Error("Faltan los datos del local que menciona bravas");
        const stem = args.place.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "restaurante";
        let slug = stem, suffix = 1;
        while (await ctx.db.query("places").withIndex("by_slug", query => query.eq("slug", slug)).first()) slug = `${stem}-${++suffix}`;
        placeId = await ctx.db.insert("places", { ...args.place, slug, city: "Madrid", country: "España",
          neighborhood: SCAN_AREAS[target.areaIndex], externalPlaceId: target.externalId, priceLevel: 2, status: "published",
          source: "google_places", googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(args.place.name)}&query_place_id=${encodeURIComponent(target.externalId)}`,
          createdAt: Date.now(), updatedAt: Date.now() });
      }
      imported = true;
    }
    if (placeId && weights.overall > 0) {
      const scores = Object.fromEntries(Object.keys(weights).filter(key => weights[key] > 0).map(key => [key, Math.round(totals[key] / weights[key] * 10) / 10]));
      const rating = { placeId, overallScore: scores.overall, scores, evidenceCount,
        confidenceScore: Math.min(70, Math.round(Math.min(evidenceCount / 20, 1) * 70 * weights.overall / evidenceCount)),
        analyzedAt: Date.now(), methodologyVersion: SCANNER_VERSION, complete: !args.nextPage };
      const existing = await ctx.db.query("automaticRatings").withIndex("by_placeId", query => query.eq("placeId", placeId!)).unique();
      if (existing) await ctx.db.patch("automaticRatings", existing._id, rating);
      else await ctx.db.insert("automaticRatings", rating);
    }
    await ctx.db.insert("restaurantScanPages", { targetId: target._id, page, reviewCount: args.reviewCount });
    await ctx.db.patch("restaurantScanTargets", target._id, { placeId, nextPage, reviewCount, limitReached,
      status: nextPage ? "pending" : "complete", mentionCount, evidenceCount, totals, weights, updatedAt: Date.now() });
    await ctx.db.patch("restaurantScans", scan._id, { checked: scan.checked + (nextPage ? 0 : 1), imported: scan.imported + (imported ? 1 : 0),
      reviewPages: scan.reviewPages + 1, lease: undefined, leaseUntil: undefined, updatedAt: Date.now() });
  },
});

export const fail = mutation({
  args: { lease: v.string(), error: v.string() },
  handler: async (ctx, { lease, error }) => {
    await authorize(ctx);
    const scan = await state(ctx);
    if (scan?.lease === lease) await ctx.db.patch("restaurantScans", scan._id, { error: error.slice(0, 500), lease: undefined, leaseUntil: undefined, updatedAt: Date.now() });
  },
});
