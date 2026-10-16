import { ConvexHttpClient } from "convex/browser";
import { makeFunctionReference } from "convex/server";
import { demoPlaces } from "@/lib/demo-data";
import type { MapPlace,Place,PlaceOption } from "@/lib/types";

type Page<T> = { page: T[]; isDone: boolean; continueCursor: string };

function client(): ConvexHttpClient | null {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  return url ? new ConvexHttpClient(url) : null;
}

function logConvexFallback(label: string, error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  console.warn(`${label}: ${message.slice(0, 500)}`);
}

async function queryAllPages<T>(convex: ConvexHttpClient, functionName: string, limit = Infinity): Promise<T[]> {
  const rows: T[] = [];
  let cursor: string | null = null;
  do {
    const result: Page<T> = await convex.query(
      makeFunctionReference<"query", { paginationOpts: { cursor: string | null; numItems: number } }, Page<T>>(functionName),
      { paginationOpts: { cursor, numItems: 75 } },
    );
    rows.push(...result.page);
    if (rows.length >= limit) return rows.slice(0, limit);
    cursor = result.isDone ? null : result.continueCursor;
    if (result.isDone) return rows;
  } while (cursor);
  return rows;
}

export async function getPlaces(limit = Infinity): Promise<Place[]> {
  const convex = client();
  if (!convex) return demoPlaces.slice(0, limit);

  try {
    return await queryAllPages<Place>(convex, "places:listPage", limit);
  } catch (error) {
    logConvexFallback("Convex unavailable; showing clearly labelled demo data", error);
    return demoPlaces.slice(0, limit);
  }
}

export async function getRegisteredPlaceCount(): Promise<number> {
  const convex = client();
  if (!convex) return demoPlaces.length;

  try {
    let total = 0;
    let cursor: string | null = null;
    do {
      const result: Page<number> = await convex.query(
        makeFunctionReference<"query", { paginationOpts: { cursor: string | null; numItems: number } }, Page<number>>("places:countPage"),
        { paginationOpts: { cursor, numItems: 500 } },
      );
      total += result.page.length;
      if (result.isDone) return total;
      cursor = result.continueCursor;
    } while (cursor);
    return total;
  } catch (error) {
    logConvexFallback("Dedicated place count unavailable; using the compatible map listing", error);
    try {
      return (await queryAllPages<MapPlace>(convex, "places:listMapPage")).length;
    } catch (fallbackError) {
      logConvexFallback("Could not count registered places", fallbackError);
      return demoPlaces.length;
    }
  }
}

export async function getMapPlaces(): Promise<MapPlace[]> {
  const convex = client();
  if (!convex) return demoPlaces;

  try {
    return await queryAllPages<MapPlace>(convex, "places:listMapPage");
  } catch (error) {
    logConvexFallback("Convex unavailable; falling back to map demo data", error);
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
    logConvexFallback("Convex unavailable; falling back to demo data", error);
    return demoPlaces.find((place) => place.slug === slug) ?? null;
  }
}

export async function getPlaceOptions(): Promise<PlaceOption[]> {
  const convex=client();if(!convex)return demoPlaces.map(({id,name,neighborhood,city,status})=>({id,name,neighborhood,city,status}));
  try{return await convex.query(makeFunctionReference<"query",Record<string,never>,PlaceOption[]>("places:listBasic"),{})}catch(error){logConvexFallback("Could not load place options",error);return []}
}
