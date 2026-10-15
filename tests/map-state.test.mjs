import assert from "node:assert/strict";
import test from "node:test";
import {
  buildMapHref,
  buildPlaceHref,
  getPlaceBackHref,
  readMapViewState,
} from "../src/lib/map-state.ts";

test("map state round-trips through the URL", () => {
  const href = buildMapHref("es", {
    latitude: 40.416775,
    longitude: -3.70379,
    zoom: 15,
    selectedPlaceId: "place-123",
  });
  assert.equal(href, "/es/mapa?lat=40.416775&lng=-3.703790&zoom=15&place=place-123");
  assert.deepEqual(readMapViewState(new URL(href, "https://example.test").searchParams), {
    latitude: 40.416775,
    longitude: -3.70379,
    zoom: 15,
    selectedPlaceId: "place-123",
  });
});

test("a place opened from the map returns to the exact map state", () => {
  const mapHref = "/es/mapa?lat=40.4&lng=-3.7&zoom=14&place=abc";
  const placeHref = buildPlaceHref("es", "bar-manolo", mapHref);
  const from = new URL(placeHref, "https://example.test").searchParams.get("from") ?? undefined;
  assert.equal(getPlaceBackHref("es", from), mapHref);
});

test("detail pages reject external or cross-locale return URLs", () => {
  assert.equal(getPlaceBackHref("es", "https://evil.test/es/mapa"), "/es/bravas");
  assert.equal(getPlaceBackHref("es", "/en/mapa?zoom=12"), "/es/bravas");
  assert.equal(getPlaceBackHref("es"), "/es/bravas");
});

test("invalid map coordinates are ignored", () => {
  assert.equal(readMapViewState(new URLSearchParams("zoom=14")), undefined);
  assert.equal(readMapViewState(new URLSearchParams("lat=999&lng=-3.7&zoom=14")), undefined);
  assert.equal(readMapViewState(new URLSearchParams("lat=40.4&lng=-3.7&zoom=99")), undefined);
});
