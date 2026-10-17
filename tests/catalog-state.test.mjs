import assert from "node:assert/strict";
import test from "node:test";
import { buildCatalogHref, CLEARED_CATALOG_STATE, DEFAULT_CATALOG_STATE, filterCatalogPlaces, findNextCatalogPlace, readCatalogState } from "../src/lib/catalog-state.ts";

const place = (overrides = {}) => ({
  id: "1", name: "Bar", slug: "bar", city: "Madrid", neighborhood: "Centro", image: undefined,
  communityPhotos: [], confidenceScore: 50, evidenceCount: 2, scores: { overall: 7 }, productType: "bravas",
  ...overrides,
});

test("catalog state round-trips through the URL", () => {
  const href = buildCatalogHref("es", { search: "casa", region: "Comunidad de Madrid", city: "Madrid", area: "Centro", sort: "recent", withoutPhoto: true, hideReviewedWithoutPhoto: true, page: 3 });
  assert.deepEqual(readCatalogState(new URL(href, "https://example.test").searchParams), {
    search: "casa", region: "Comunidad de Madrid", city: "Madrid", area: "Centro", sort: "recent", withoutPhoto: true, hideReviewedWithoutPhoto: true, page: 3,
  });
});

test("Madrid is the default city when the URL has no city filter", () => {
  assert.equal(DEFAULT_CATALOG_STATE.region, "Comunidad de Madrid");
  assert.equal(DEFAULT_CATALOG_STATE.city, "Madrid");
  assert.equal(readCatalogState(new URLSearchParams()).region, "Comunidad de Madrid");
  assert.equal(readCatalogState(new URLSearchParams()).city, "Madrid");
});

test("legacy city links remain valid without a region parameter", () => {
  const state = readCatalogState(new URLSearchParams("city=Barcelona"));
  assert.equal(state.region, "");
  assert.equal(state.city, "Barcelona");
});

test("an explicit all-cities selection survives a URL round trip", () => {
  const state = { ...DEFAULT_CATALOG_STATE, city: "", area: "" };
  const href = buildCatalogHref("es", state);
  assert.equal(new URL(href, "https://example.test").searchParams.has("city"), true);
  assert.deepEqual(readCatalogState(new URL(href, "https://example.test").searchParams), state);
});

test("clearing filters selects all regions and cities", () => {
  const href = buildCatalogHref("es", CLEARED_CATALOG_STATE);
  assert.deepEqual(readCatalogState(new URL(href, "https://example.test").searchParams), CLEARED_CATALOG_STATE);
});

test("catalog filtering and sorting is shared with detail navigation", () => {
  const places = [
    place({ id: "1", slug: "with-photo", image: "/photo.jpg", scores: { overall: 9 } }),
    place({ id: "2", slug: "reviewed", noPhotoFound: true, scores: { overall: 7 } }),
    place({ id: "3", slug: "second", scores: { overall: 6 } }),
    place({ id: "4", slug: "first", scores: { overall: 8 } }),
  ];
  const result = filterCatalogPlaces(places, { search: "", region: "", city: "Madrid", area: "", sort: "score", withoutPhoto: true, hideReviewedWithoutPhoto: true, page: 1 });
  assert.deepEqual(result.map((item) => item.slug), ["first", "second"]);
});

test("the next pending place remains available after marking the current place as reviewed", () => {
  const places = [
    place({ id: "1", slug: "current", noPhotoFound: true, scores: { overall: 9 } }),
    place({ id: "2", slug: "already-reviewed", noPhotoFound: true, scores: { overall: 8 } }),
    place({ id: "3", slug: "next-pending", scores: { overall: 7 } }),
  ];
  const state = { search: "", region: "", city: "Madrid", area: "", sort: "score", withoutPhoto: true, hideReviewedWithoutPhoto: true, page: 1 };
  assert.equal(findNextCatalogPlace(places, "current", state)?.slug, "next-pending");
});
