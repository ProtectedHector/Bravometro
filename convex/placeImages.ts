import { v, ConvexError } from "convex/values";
import { query, mutation, type QueryCtx, type MutationCtx } from "./_generated/server";
import { SCANNER_USER_ID } from "./scanPlan";

async function administrator(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity || identity.issuer !== process.env.CLERK_JWT_ISSUER_DOMAIN) return null;
  const user = await ctx.db.query("users").withIndex("by_clerk_id", query => query.eq("clerkUserId", identity.subject)).unique();
  return user?._id === SCANNER_USER_ID ? user : null;
}

async function eligibility(ctx: QueryCtx | MutationCtx, slug: string) {
  const user = await administrator(ctx);
  if (!user) return { allowed: false as const };
  const place = await ctx.db.query("places").withIndex("by_slug", query => query.eq("slug", slug)).unique();
  if (!place || place.status !== "published") return { allowed: true as const, eligible: false as const };
  const manual = await ctx.db.query("userRatings").withIndex("by_place", query => query.eq("placeId", place._id))
    .filter(query => query.and(query.eq(query.field("productType"), "bravas"), query.neq(query.field("status"), "rejected"))).first();
  return { allowed: true as const, eligible: !manual, place, user };
}

async function requireEligible(ctx: MutationCtx, slug: string) {
  const result = await eligibility(ctx, slug);
  if (!result.allowed) throw new ConvexError("Solo el administrador puede subir imágenes de restaurantes");
  if (!result.eligible || !result.place || !result.user) throw new ConvexError("Solo se pueden subir imágenes a restaurantes publicados sin reseñas manuales aprobadas o pendientes");
  return result;
}

export const status = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const result = await eligibility(ctx, slug);
    return { allowed: result.allowed, eligible: result.allowed && result.eligible === true };
  },
});

export const uploadUrl = mutation({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    await requireEligible(ctx, slug);
    return ctx.storage.generateUploadUrl();
  },
});

export const save = mutation({
  args: { slug: v.string(), storageId: v.id("_storage") },
  handler: async (ctx, { slug, storageId }) => {
    const { place, user } = await requireEligible(ctx, slug);
    const metadata = await ctx.db.system.get("_storage", storageId);
    if (!metadata || metadata.size === 0 || metadata.size > 5 * 1024 * 1024) throw new ConvexError("La imagen no existe o supera los 5 MB");
    if (!metadata.contentType || !["image/jpeg", "image/png", "image/webp"].includes(metadata.contentType)) throw new ConvexError("Solo se admiten imágenes JPG, PNG o WebP");
    const existing = await ctx.db.query("placeImages").withIndex("by_placeId", query => query.eq("placeId", place._id)).unique();
    if (existing) {
      await ctx.db.patch("placeImages", existing._id, { storageId, updatedBy: user._id, updatedAt: Date.now() });
      if (existing.storageId !== storageId) await ctx.storage.delete(existing.storageId);
    } else {
      await ctx.db.insert("placeImages", { placeId: place._id, storageId, createdBy: user._id, updatedBy: user._id, createdAt: Date.now(), updatedAt: Date.now() });
    }
    return { imageUrl: await ctx.storage.getUrl(storageId) };
  },
});
