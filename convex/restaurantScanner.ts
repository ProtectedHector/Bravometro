import { v } from "convex/values";
import { mutation, query, type QueryCtx, type MutationCtx } from "./_generated/server";
import { SCAN_AREAS, SCANNER_USER_ID, SCANNER_VERSION } from "./scanPlan";
import { MAX_REVIEW_PAGES, REVIEW_LIMIT, SCORE_ATTRIBUTES, serpapiQuotaState, sufficientEvidence } from "./scanLimits";

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

function serpapiQuota(scan: NonNullable<Awaited<ReturnType<typeof state>>>) {
  return serpapiQuotaState({ now: Date.now(), hourStartedAt: scan.serpapiHourStartedAt, hourRequests: scan.serpapiHourRequests,
    monthStartedAt: scan.serpapiMonthStartedAt, monthRequests: scan.serpapiMonthRequests });
}

export const status = query({
  args: {},
  handler: async ctx => {
    if (!await permitted(ctx)) return { allowed: false };
    const scan = await state(ctx);
    const quota = scan ? serpapiQuota(scan) : undefined;
    return { allowed: true, area: SCAN_AREAS[scan?.areaIndex ?? 0] ?? "Finalizado", finished: scan?.finished ?? false,
      checked: scan?.checked ?? 0, imported: scan?.imported ?? 0, reviewPages: scan?.reviewPages ?? 0,
      requests: scan?.requests ?? 0, serpapiHourRequests: quota?.hourRequests ?? 0, serpapiMonthRequests: quota?.monthRequests ?? 0,
      serpapiPausedUntil: quota && !quota.allowed ? quota.pausedUntil : null, serpapiPauseReason: quota && !quota.allowed ? quota.pauseReason : null,
      error: scan?.error ?? null };
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
    const quota = serpapiQuota(scan);
    if (!quota.allowed) {
      await ctx.db.patch("restaurantScans", scan._id, { serpapiHourStartedAt: quota.hourStartedAt, serpapiHourRequests: quota.hourRequests,
        serpapiMonthStartedAt: quota.monthStartedAt, serpapiMonthRequests: quota.monthRequests, serpapiPausedUntil: quota.pausedUntil,
        serpapiPauseReason: quota.pauseReason, error: quota.pauseReason === "monthly" ? "Cuota mensual de SerpAPI agotada" : "Límite horario de SerpAPI alcanzado",
        lease: undefined, leaseUntil: undefined, updatedAt: Date.now() });
      return { kind: "paused" as const, pausedUntil: quota.pausedUntil, pauseReason: quota.pauseReason };
    }
    let target = await ctx.db.query("restaurantScanTargets").withIndex("by_areaIndex_and_status", query => query.eq("areaIndex", scan.areaIndex).eq("status", "pending")).first();
    if (target && target.reviewCount === undefined) {
      const pages = await ctx.db.query("restaurantScanPages").withIndex("by_targetId_and_page", query => query.eq("targetId", target!._id)).take(REVIEW_LIMIT / 20);
      const reviewCount = pages.reduce((count, page) => count + (page.reviewCount ?? 20), 0);
      await ctx.db.patch("restaurantScanTargets", target._id, { reviewCount });
      target = { ...target, reviewCount };
    }
    if (target && (target.reviewCount ?? 0) >= REVIEW_LIMIT) {
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
  args: { lease: v.string(), targetId: v.optional(v.id("restaurantScanTargets")) },
  handler: async (ctx, { lease, targetId }) => {
    const scan = await owned(ctx, lease);
    const quota = serpapiQuota(scan);
    if (!quota.allowed) {
      await ctx.db.patch("restaurantScans", scan._id, { serpapiHourStartedAt: quota.hourStartedAt, serpapiHourRequests: quota.hourRequests,
        serpapiMonthStartedAt: quota.monthStartedAt, serpapiMonthRequests: quota.monthRequests, serpapiPausedUntil: quota.pausedUntil,
        serpapiPauseReason: quota.pauseReason, error: quota.pauseReason === "monthly" ? "Cuota mensual de SerpAPI agotada" : "Límite horario de SerpAPI alcanzado",
        lease: undefined, leaseUntil: undefined, updatedAt: Date.now() });
      throw new Error(quota.pauseReason === "monthly" ? "Cuota mensual de SerpAPI agotada" : "Límite horario de SerpAPI alcanzado");
    }
    await ctx.db.patch("restaurantScans", scan._id, { requests: scan.requests + 1, serpapiHourStartedAt: quota.hourStartedAt,
      serpapiHourRequests: quota.hourRequests + 1, serpapiMonthStartedAt: quota.monthStartedAt, serpapiMonthRequests: quota.monthRequests + 1,
      serpapiPausedUntil: undefined, serpapiPauseReason: undefined });
    if (targetId) {
      const target = await ctx.db.get("restaurantScanTargets", targetId);
      if (target) await ctx.db.patch("restaurantScanTargets", targetId, { serpRequests: (target.serpRequests ?? 0) + 1, updatedAt: Date.now() });
    }
  },
});

export const saveSearch = mutation({
  args: { lease: v.string(), targets: v.array(v.object({ externalId: v.string(), dataId: v.string(), name: v.optional(v.string()), address: v.optional(v.string()), latitude: v.optional(v.number()), longitude: v.optional(v.number()) })), hasNext: v.boolean() },
  handler: async (ctx, { lease, targets, hasNext }) => {
    const scan = await owned(ctx, lease);
    for (const target of targets.slice(0, 20)) {
      const existing = await ctx.db.query("restaurantScanTargets").withIndex("by_externalId", query => query.eq("externalId", target.externalId)).unique();
      if (!existing) await ctx.db.insert("restaurantScanTargets", { ...target, areaIndex: scan.areaIndex, status: "pending",
        mentionCount: 0, evidenceCount: 0, reviewCount: 0, serpRequests: 0, totals: {}, weights: {}, updatedAt: Date.now() });
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
    const evidenceCount = target.evidenceCount + args.evidenceCount;
    const totals = { ...target.totals }, weights = { ...target.weights };
    for (const key of SCORE_ATTRIBUTES) {
      const total = args.totals[key] ?? 0, weight = args.weights[key] ?? 0;
      if (!Number.isFinite(total) || !Number.isFinite(weight) || weight < 0 || weight > args.evidenceCount || total < 0 || total > 10 * weight + 1e-9) throw new Error("Puntuación automática inválida");
      totals[key] = (totals[key] ?? 0) + total;
      weights[key] = (weights[key] ?? 0) + weight;
    }
    const priorPages = await ctx.db.query("restaurantScanPages").withIndex("by_targetId_and_page", query => query.eq("targetId", target._id)).take(MAX_REVIEW_PAGES);
    const enough = sufficientEvidence(evidenceCount, weights);
    const limitReached = priorPages.length + 1 >= MAX_REVIEW_PAGES || reviewCount >= REVIEW_LIMIT;
    const nextPage = enough || limitReached ? undefined : args.nextPage;
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
    if (placeId) {
      const scores = Object.fromEntries(SCORE_ATTRIBUTES.map(key => [key, weights[key] > 0 ? Math.round(totals[key] / weights[key] * 10) / 10 : 5]));
      const coveredAttributes = SCORE_ATTRIBUTES.filter(key => weights[key] > 0).length;
      const rating = { placeId, overallScore: scores.overall, scores, evidenceCount,
        confidenceScore: evidenceCount ? Math.min(70, Math.round(Math.min(evidenceCount / 20, 1) * 70 * Math.min(weights.overall ?? 0, evidenceCount) / evidenceCount)) : 0,
        coveredAttributes, neutralAttributes: SCORE_ATTRIBUTES.length - coveredAttributes,
        analyzedAt: Date.now(), methodologyVersion: SCANNER_VERSION, complete: !nextPage };
      const existing = await ctx.db.query("automaticRatings").withIndex("by_placeId", query => query.eq("placeId", placeId!)).unique();
      if (existing) await ctx.db.patch("automaticRatings", existing._id, rating);
      else await ctx.db.insert("automaticRatings", rating);
    }
    await ctx.db.insert("restaurantScanPages", { targetId: target._id, page, reviewCount: args.reviewCount });
    await ctx.db.patch("restaurantScanTargets", target._id, { placeId, nextPage, reviewCount, limitReached,
      status: nextPage ? "pending" : "complete", mentionCount, evidenceCount, totals, weights, lastError: undefined, updatedAt: Date.now() });
    await ctx.db.patch("restaurantScans", scan._id, { checked: scan.checked + (nextPage ? 0 : 1), imported: scan.imported + (imported ? 1 : 0),
      reviewPages: scan.reviewPages + 1, lease: undefined, leaseUntil: undefined, updatedAt: Date.now() });
  },
});

export const fail = mutation({
  args: { lease: v.string(), error: v.string(), targetId: v.optional(v.id("restaurantScanTargets")), skipTarget: v.optional(v.boolean()) },
  handler: async (ctx, { lease, error, targetId, skipTarget }) => {
    await authorize(ctx);
    const scan = await state(ctx);
    if (scan?.lease !== lease) return;
    if (targetId && skipTarget) {
      const target = await ctx.db.get("restaurantScanTargets", targetId);
      if (target?.status === "pending") {
        await ctx.db.patch("restaurantScanTargets", targetId, { status: "complete", nextPage: undefined, failed: true, lastError: error.slice(0, 500), updatedAt: Date.now() });
        await ctx.db.patch("restaurantScans", scan._id, { checked: scan.checked + 1, error: `Local omitido: ${error}`.slice(0, 500), lease: undefined, leaseUntil: undefined, updatedAt: Date.now() });
        return;
      }
    }
    await ctx.db.patch("restaurantScans", scan._id, { error: error.slice(0, 500), lease: undefined, leaseUntil: undefined, updatedAt: Date.now() });
  },
});

export const resetFrom = mutation({
  args: { adminToken: v.string(), from: v.number() },
  handler: async (ctx, { adminToken, from }) => {
    if (!process.env.BRAVOMETRO_ADMIN_TOKEN || adminToken !== process.env.BRAVOMETRO_ADMIN_TOKEN) throw new Error("Unauthorized");
    if (!Number.isFinite(from) || from < 0) throw new Error("Invalid reset timestamp");
    let pagesDeleted = 0, targetsDeleted = 0, scansDeleted = 0;
    const targets = await ctx.db.query("restaurantScanTargets").collect();
    for (const target of targets) {
      if (target._creationTime < from) continue;
      const pages = await ctx.db.query("restaurantScanPages").withIndex("by_targetId_and_page", query => query.eq("targetId", target._id)).collect();
      for (const page of pages) {
        await ctx.db.delete(page._id);
        pagesDeleted++;
      }
      await ctx.db.delete(target._id);
      targetsDeleted++;
    }
    const pages = await ctx.db.query("restaurantScanPages").collect();
    for (const page of pages) {
      if (page._creationTime < from) continue;
      await ctx.db.delete(page._id);
      pagesDeleted++;
    }
    const scans = await ctx.db.query("restaurantScans").collect();
    for (const scan of scans) {
      if (scan._creationTime < from) continue;
      await ctx.db.delete(scan._id);
      scansDeleted++;
    }
    return { scansDeleted, targetsDeleted, pagesDeleted };
  },
});
