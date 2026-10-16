import "server-only";

import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { makeFunctionReference } from "convex/server";

export async function isCurrentUserAdmin(): Promise<boolean> {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || !process.env.CLERK_SECRET_KEY || !process.env.NEXT_PUBLIC_CONVEX_URL) return false;

  try {
    const { userId, getToken } = await auth();
    if (!userId) return false;
    const token = await getToken({ template: "convex" });
    if (!token) return false;
    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);
    convex.setAuth(token);
    const result = await convex.query(makeFunctionReference<"query", Record<string, never>, { allowed: boolean }>("placeAdmin:access"), {});
    return result.allowed;
  } catch {
    return false;
  }
}
