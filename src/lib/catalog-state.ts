import type { Place } from "@/lib/types";

export const CATALOG_SORTS = ["score", "recent", "confidence", "evidence"] as const;

export type CatalogSort = (typeof CATALOG_SORTS)[number];
export type CatalogState = {
  search: string;
  city: string;
  area: string;
  sort: CatalogSort;
  withoutPhoto: boolean;
  hideReviewedWithoutPhoto: boolean;
  page: number;
};

type SearchParamsReader = Pick<URLSearchParams, "get">;

export const DEFAULT_CATALOG_STATE: CatalogState = {
  search: "",
  city: "",
  area: "",
  sort: "score",
  withoutPhoto: false,
  hideReviewedWithoutPhoto: false,
  page: 1,
};

export function readCatalogState(params: SearchParamsReader): CatalogState {
  const sort = params.get("sort");
  const page = Number.parseInt(params.get("page") ?? "1", 10);
  return {
    search: params.get("q")?.trim() ?? "",
    city: params.get("city")?.trim() ?? "",
    area: params.get("area")?.trim() ?? "",
    sort: CATALOG_SORTS.includes(sort as CatalogSort) ? sort as CatalogSort : "score",
    withoutPhoto: params.get("noPhoto") === "1",
    hideReviewedWithoutPhoto: params.get("hideReviewedNoPhoto") === "1",
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

export function buildCatalogHref(locale: string, state: CatalogState): string {
  const params = new URLSearchParams();
  if (state.search) params.set("q", state.search);
  if (state.city) params.set("city", state.city);
  if (state.area) params.set("area", state.area);
  if (state.sort !== "score") params.set("sort", state.sort);
  if (state.withoutPhoto) params.set("noPhoto", "1");
  if (state.hideReviewedWithoutPhoto) params.set("hideReviewedNoPhoto", "1");
  if (state.page > 1) params.set("page", String(state.page));
  const query = params.toString();
  return `/${locale}/bravas${query ? `?${query}` : ""}`;
}

export function filterCatalogPlaces(places: Place[], state: CatalogState): Place[] {
  const search = state.search.toLocaleLowerCase();
  return places
    .filter((place) =>
      `${place.name} ${place.neighborhood} ${place.city}`.toLocaleLowerCase().includes(search) &&
      (!state.city || place.city === state.city) &&
      (!state.area || place.neighborhood === state.area) &&
      (!state.withoutPhoto || (!place.image && !place.communityPhotos?.some((photo) => photo.url))) &&
      (!state.hideReviewedWithoutPhoto || !place.noPhotoFound)
    )
    .sort((a, b) => state.sort === "confidence"
      ? b.confidenceScore - a.confidenceScore
      : state.sort === "evidence"
        ? b.evidenceCount - a.evidenceCount
        : state.sort === "recent"
          ? (b.createdAt ?? 0) - (a.createdAt ?? 0)
          : b.scores.overall - a.scores.overall);
}

export function findNextCatalogPlace(places: Place[], currentSlug: string, state: CatalogState): Place | undefined {
  const filtered = filterCatalogPlaces(places, state);
  const currentIndex = filtered.findIndex((place) => place.slug === currentSlug);
  if (currentIndex >= 0) return filtered[currentIndex + 1];
  if (!state.hideReviewedWithoutPhoto) return undefined;

  const withReviewed = filterCatalogPlaces(places, { ...state, hideReviewedWithoutPhoto: false });
  const reviewedIndex = withReviewed.findIndex((place) => place.slug === currentSlug);
  return reviewedIndex >= 0 ? withReviewed.slice(reviewedIndex + 1).find((place) => !place.noPhotoFound) : undefined;
}
