import { query, type QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { overallFromRating, overallFromScores, roundScore, scoresFromRating, type BravasAttributeScores } from "./ratingMath";

function confidence(score: number) { return score >= 72 ? "high" : score >= 42 ? "medium" : "low"; }

async function present(ctx: QueryCtx, place: Doc<"places">) {
  const adminImage = await ctx.db.query("placeImages").withIndex("by_placeId", query => query.eq("placeId", place._id)).unique();
  const adminImageUrl = adminImage ? await ctx.storage.getUrl(adminImage.storageId) : null;
  const editorial = await ctx.db.query("dishRatings").withIndex("by_place", query => query.eq("placeId", place._id)).filter(query => query.eq(query.field("productType"), "bravas")).first();
  const automatic = await ctx.db.query("automaticRatings").withIndex("by_placeId", query => query.eq("placeId", place._id)).unique();
  const community = await ctx.db.query("userRatings").withIndex("by_place", query => query.eq("placeId", place._id)).filter(query => query.and(query.eq(query.field("status"), "approved"), query.eq(query.field("productType"), "bravas"))).collect();
  if (!editorial && !automatic && !community.length) return null;
  const scores: Record<string, number> = {};
  let communityScore: number | undefined;
  if (editorial) {
    Object.assign(scores, scoresFromRating(editorial));
    scores.overall = overallFromScores(scores as BravasAttributeScores);
  } else if (community.length) {
    const average = (field: "potatoScore" | "sauceScore" | "spicinessScore" | "tasteScore" | "textureScore" | "quantityScore" | "valueScore") => roundScore(community.reduce((sum, row) => sum + row[field], 0) / community.length);
    Object.assign(scores, { potato: average("potatoScore"), sauce: average("sauceScore"), spiciness: average("spicinessScore"), taste: average("tasteScore"), texture: average("textureScore"), quantity: average("quantityScore"), value: average("valueScore") });
    scores.overall = overallFromScores(scores as BravasAttributeScores);
    communityScore = scores.overall;
  } else if (automatic) {
    Object.assign(scores, automatic.scores);
    scores.overall = overallFromScores({
      potato: scores.potato ?? 5,
      sauce: scores.sauce ?? 5,
      spiciness: scores.spiciness ?? 5,
      taste: scores.taste ?? 5,
      texture: scores.texture ?? 5,
      quantity: scores.quantity ?? 5,
      value: scores.value ?? 5,
    });
  }
  const confidenceScore = editorial?.confidenceScore ?? (community.length ? Math.round(Math.min(community.length / 40, 1) * 75 + 25 / 3) : automatic!.confidenceScore);
  const analyzedAt = editorial?.analyzedAt ?? (community.length ? Math.max(...community.map(row => row.updatedAt)) : automatic!.analyzedAt);
  const communityPhotos = (await Promise.all(community.filter(row => row.photoStorageId).map(async row => ({ url: await ctx.storage.getUrl(row.photoStorageId!), userName: row.userName, score: overallFromRating(row), comment: row.comment })))).filter(photo => photo.url);
  const automaticScore = automatic ? overallFromScores({
    potato: automatic.scores.potato ?? 5,
    sauce: automatic.scores.sauce ?? 5,
    spiciness: automatic.scores.spiciness ?? 5,
    taste: automatic.scores.taste ?? 5,
    texture: automatic.scores.texture ?? 5,
    quantity: automatic.scores.quantity ?? 5,
    value: automatic.scores.value ?? 5,
  }) : undefined;
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
    automaticScore, automaticEvidenceCount: automatic?.evidenceCount, automaticComplete: automatic?.complete };
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
