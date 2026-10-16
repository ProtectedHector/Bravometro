import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { administrator } from "./adminIdentity";

export const access = query({
  args: {},
  handler: async ctx => ({ allowed: Boolean(await administrator(ctx)) }),
});

export const status = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const user = await administrator(ctx);
    if (!user) return { allowed: false as const };
    const place = await ctx.db.query("places").withIndex("by_slug", value => value.eq("slug", slug)).unique();
    return { allowed: true as const, canDelete: place?.status === "published", noPhotoFound: place?.noPhotoFound === true };
  },
});

export const setNoPhotoFound = mutation({
  args: { slug: v.string(), noPhotoFound: v.boolean() },
  handler: async (ctx, { slug, noPhotoFound }) => {
    const user = await administrator(ctx);
    if (!user) throw new ConvexError("Solo el administrador puede revisar las fotos de restaurantes");
    const place = await ctx.db.query("places").withIndex("by_slug", value => value.eq("slug", slug)).unique();
    if (!place) throw new ConvexError("El restaurante no existe");
    if (place.status !== "published") throw new ConvexError("El restaurante no está publicado");
    const now = Date.now();
    await ctx.db.patch("places", place._id, noPhotoFound
      ? { noPhotoFound: true, noPhotoFoundAt: now, noPhotoFoundBy: user._id, updatedAt: now }
      : { noPhotoFound: undefined, noPhotoFoundAt: undefined, noPhotoFoundBy: undefined, updatedAt: now });
    return { noPhotoFound };
  },
});

export const markPermanentlyClosed = mutation({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const user = await administrator(ctx);
    if (!user) throw new ConvexError("Solo el administrador puede eliminar restaurantes");
    const place = await ctx.db.query("places").withIndex("by_slug", value => value.eq("slug", slug)).unique();
    if (!place) throw new ConvexError("El restaurante no existe");
    if (place.status === "deleted") return { deleted: true as const };
    if (place.status !== "published") throw new ConvexError("El restaurante no está publicado");
    const now = Date.now();
    await ctx.db.patch("places", place._id, { status: "deleted", deletedAt: now, deletedBy: user._id, updatedAt: now });
    return { deleted: true as const };
  },
});
