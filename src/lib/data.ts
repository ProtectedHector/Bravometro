import { ConvexHttpClient } from "convex/browser";
import { makeFunctionReference } from "convex/server";
import { demoPlaces } from "@/lib/demo-data";
import type { Place,PlaceOption } from "@/lib/types";

function client(): ConvexHttpClient | null {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  return url ? new ConvexHttpClient(url) : null;
}

export async function getPlaces(): Promise<Place[]> {
  const convex = client();
  if (!convex) return demoPlaces;

  try {
    return await convex.query(
      makeFunctionReference<"query", Record<string, never>, Place[]>("places:list"),
      {},
    );
  } catch (error) {
    console.error("Convex unavailable; showing clearly labelled demo data.", error);
    return demoPlaces;
  }
}

export async function getPlaceBySlug(slug: string): Promise<Place | null> {
  const convex = client();
  if (!convex) return demoPlaces.find((place) => place.slug === slug) ?? null;

  try {
    return await convex.query(
      makeFunctionReference<"query", { slug: string }, Place | null>("places:bySlug"),
      { slug },
    );
  } catch (error) {
    console.error("Convex unavailable; falling back to demo data.", error);
    return demoPlaces.find((place) => place.slug === slug) ?? null;
  }
}

export async function getPlaceOptions(): Promise<PlaceOption[]> {
  const convex=client();if(!convex)return demoPlaces.map(({id,name,neighborhood,city,status})=>({id,name,neighborhood,city,status}));
  try{return await convex.query(makeFunctionReference<"query",Record<string,never>,PlaceOption[]>("places:listBasic"),{})}catch(error){console.error("Could not load place options",error);return []}
}
