import assert from "node:assert/strict";
import test from "node:test";
import { buildCatalogHref, DEFAULT_CATALOG_STATE, filterCatalogPlaces, findNextCatalogPlace, readCatalogState } from "../src/lib/catalog-state.ts";

const place = (overrides = {}) => ({
  id: "1", name: "Bar", slug: "bar", city: "Madrid", neighborhood: "Centro", image: undefined,
  communityPhotos: [], confidenceScore: 50, evidenceCount: 2, scores: { overall: 7 }, productType: "bravas",
  ...overrides,
});

test("catalog state round-trips through the URL", () => {
  const href = buildCatalogHref("es", { search: "casa", city: "Madrid", area: "Centro", sort: "recent", withoutPhoto: true, hideReviewedWithoutPhoto: true, page: 3 });
  assert.deepEqual(readCatalogState(new URL(href, "https://example.test").searchParams), {
    search: "casa", city: "Madrid", area: "Centro", sort: "recent", withoutPhoto: true, hideReviewedWithoutPhoto: true, page: 3,
  });
});

test("Madrid is the default city when the URL has no city filter", () => {
  assert.equal(DEFAULT_CATALOG_STATE.city, "Madrid");
  assert.equal(readCatalogState(new URLSearchParams()).city, "Madrid");
});

test("catalog filtering and sorting is shared with detail navigation", () => {
  const places = [
    place({ id: "1", slug: "with-photo", image: "/photo.jpg", scores: { overall: 9 } }),
    place({ id: "2", slug: "reviewed", noPhotoFound: true, scores: { overall: 7 } }),
    place({ id: "3", slug: "second", scores: { overall: 6 } }),
    place({ id: "4", slug: "first", scores: { overall: 8 } }),
  ];
  const result = filterCatalogPlaces(places, { search: "", city: "Madrid", area: "", sort: "score", withoutPhoto: true, hideReviewedWithoutPhoto: true, page: 1 });
  assert.deepEqual(result.map((item) => item.slug), ["first", "second"]);
});

test("the next pending place remains available after marking the current place as reviewed", () => {
  const places = [
    place({ id: "1", slug: "current", noPhotoFound: true, scores: { overall: 9 } }),
    place({ id: "2", slug: "already-reviewed", noPhotoFound: true, scores: { overall: 8 } }),
    place({ id: "3", slug: "next-pending", scores: { overall: 7 } }),
  ];
  const state = { search: "", city: "Madrid", area: "", sort: "score", withoutPhoto: true, hideReviewedWithoutPhoto: true, page: 1 };
  assert.equal(findNextCatalogPlace(places, "current", state)?.slug, "next-pending");
});
