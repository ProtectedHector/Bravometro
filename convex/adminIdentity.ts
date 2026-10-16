import type { MutationCtx, QueryCtx } from "./_generated/server";
import { SCANNER_USER_ID } from "./scanPlan";

export async function administrator(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity || identity.issuer !== process.env.CLERK_JWT_ISSUER_DOMAIN) return null;
  const user = await ctx.db.query("users").withIndex("by_clerk_id", query => query.eq("clerkUserId", identity.subject)).unique();
  return user?._id === SCANNER_USER_ID ? user : null;
}
