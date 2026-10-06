import { query, type QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";

function confidence(score: number) { return score >= 72 ? "high" : score >= 42 ? "medium" : "low"; }

async function present(ctx: QueryCtx, place: Doc<"places">) {
  const adminImage = await ctx.db.query("placeImages").withIndex("by_placeId", query => query.eq("placeId", place._id)).unique();
  const adminImageUrl = adminImage ? await ctx.storage.getUrl(adminImage.storageId) : null;
  const editorial = await ctx.db.query("dishRatings").withIndex("by_place", query => query.eq("placeId", place._id)).filter(query => query.eq(query.field("productType"), "bravas")).first();
  const automatic = await ctx.db.query("automaticRatings").withIndex("by_placeId", query => query.eq("placeId", place._id)).unique();
  const community = await ctx.db.query("userRatings").withIndex("by_place", query => query.eq("placeId", place._id)).filter(query => query.and(query.eq(query.field("status"), "approved"), query.eq(query.field("productType"), "bravas"))).collect();
  if (!editorial && !automatic && !community.length) return null;
  const average = (field: "overallScore" | "potatoScore" | "sauceScore" | "spicinessScore" | "tasteScore" | "textureScore" | "quantityScore" | "valueScore") => Math.round(community.reduce((sum, row) => sum + row[field], 0) / community.length * 10) / 10;
  const communityScore = community.length ? average("overallScore") : undefined;
  const scores: Record<string, number> = {};
  for (const [key, field] of [["overall", "overallScore"], ["potato", "potatoScore"], ["sauce", "sauceScore"], ["spiciness", "spicinessScore"], ["taste", "tasteScore"], ["texture", "textureScore"], ["quantity", "quantityScore"], ["value", "valueScore"]] as const) {
    const manual = editorial?.[field] ?? (community.length ? average(field) : undefined);
    const inferred = automatic?.scores[key];
    if (manual !== undefined) {
      const weight = 1 / (1 + 4 * (community.length || 1));
      scores[key] = Math.round((inferred === undefined ? manual : inferred * weight + manual * (1 - weight)) * 10) / 10;
    } else if (inferred !== undefined) scores[key] = inferred;
  }
  const confidenceScore = editorial?.confidenceScore ?? (community.length ? Math.round(Math.min(community.length / 40, 1) * 75 + 25 / 3) : automatic!.confidenceScore);
  const analyzedAt = editorial?.analyzedAt ?? (community.length ? Math.max(...community.map(row => row.updatedAt)) : automatic!.analyzedAt);
  const communityPhotos = (await Promise.all(community.filter(row => row.photoStorageId).map(async row => ({ url: await ctx.storage.getUrl(row.photoStorageId!), userName: row.userName, score: row.overallScore, comment: row.comment })))).filter(photo => photo.url);
  return { id: place._id, name: place.name, slug: place.slug, city: place.city, country: place.country, neighborhood: place.neighborhood,
    address: place.address, latitude: place.latitude, longitude: place.longitude, website: place.website, phone: place.phone,
    googlePlaceId: place.externalPlaceId, googleMapsUrl: place.googleMapsUrl, source: place.source, verifiedAt: place.verifiedAt,
    priceLevel: place.priceLevel, image: adminImageUrl ?? place.image, status: place.status, productType: "bravas", scores,
    confidence: confidence(confidenceScore), confidenceScore, evidenceCount: editorial?.evidenceCount ?? (community.length || automatic!.evidenceCount),
    summary: { es: editorial?.summaryEs ?? (community.length ? "Puntuación basada en valoraciones aprobadas de la comunidad de Bravómetro." : "Estimación automática provisional de las bravas. No es una valoración manual."),
      en: editorial?.summaryEn ?? (community.length ? "Score based on approved ratings from the Bravómetro community." : "Provisional automated bravas estimate. Not a manual rating.") },
    highlights: { es: editorial?.highlightsEs ?? [], en: editorial?.highlightsEn ?? [] },
    methodologyVersion: editorial?.methodologyVersion ?? (community.length ? "community-1.0" : automatic!.methodologyVersion),
    analyzedAt: new Date(analyzedAt).toISOString().slice(0, 10), communityScore, communityRatingCount: community.length, communityPhotos,
    automaticScore: automatic?.overallScore, automaticEvidenceCount: automatic?.evidenceCount, automaticComplete: automatic?.complete };
}

export const list = query({ args: {}, handler: async ctx => {
  const places = await ctx.db.query("places").filter(query => query.eq(query.field("status"), "published")).collect();
  return (await Promise.all(places.map(place => present(ctx, place)))).filter(Boolean);
} });
export const bySlug = query({ args: { slug: v.string() }, handler: async (ctx, { slug }) => {
  const place = await ctx.db.query("places").withIndex("by_slug", query => query.eq("slug", slug)).unique();
  return place ? present(ctx, place) : null;
} });
export const listBasic = query({ args: {}, handler: async ctx => {
  const places = await ctx.db.query("places").filter(query => query.eq(query.field("status"), "published")).collect();
  return places.map(place => ({ id: place._id, name: place.name, neighborhood: place.neighborhood, city: place.city, status: place.status }));
} });
export const findByExternalIds = query({ args: { externalPlaceIds: v.array(v.string()) }, handler: async (ctx, { externalPlaceIds }) => {
  const rows = [];
  for (const externalPlaceId of externalPlaceIds.slice(0, 20)) {
    const place = await ctx.db.query("places").withIndex("by_external_place", query => query.eq("externalPlaceId", externalPlaceId)).first();
    if (!place || place.status !== "published") continue;
    const presented = await present(ctx, place);
    rows.push({ googlePlaceId: externalPlaceId, slug: place.slug, score: presented?.scores.overall ?? null, ratingCount: presented?.communityRatingCount ?? 0 });
  }
  return rows;
} });
