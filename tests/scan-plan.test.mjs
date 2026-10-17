import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  CATALAN_MUNICIPALITIES,
  MADRID_MUNICIPALITIES,
  VALENCIAN_MUNICIPALITIES,
} from "../convex/scanMunicipalities.ts";
import { OTHER_SPANISH_MUNICIPALITIES } from "../convex/scanMunicipalitiesRest.ts";

test("the scan plan includes every official municipality in the requested regions", () => {
  assert.equal(MADRID_MUNICIPALITIES.length, 178); // Madrid city is already covered by its 24 areas.
  assert.equal(VALENCIAN_MUNICIPALITIES.length, 542);
  assert.equal(CATALAN_MUNICIPALITIES.length, 947);
});

test("the expanded plan resumes with Móstoles and Alcorcón after the legacy Madrid areas", () => {
  assert.equal(MADRID_MUNICIPALITIES[0].municipality, "Móstoles");
  assert.equal(MADRID_MUNICIPALITIES[1].municipality, "Alcorcón");
  assert.equal(VALENCIAN_MUNICIPALITIES[0].municipality, "Alacant/Alicante");
  assert.equal(CATALAN_MUNICIPALITIES[0].municipality, "Barcelona");
});

test("the rest of Spain follows Catalonia without duplicating the first three regions", () => {
  assert.equal(OTHER_SPANISH_MUNICIPALITIES.length, 6464);
  assert.equal(OTHER_SPANISH_MUNICIPALITIES[0].municipality, "Agurain/Salvatierra");
  assert.equal(OTHER_SPANISH_MUNICIPALITIES.at(-1).municipality, "Melilla");
  assert.equal(new Set(OTHER_SPANISH_MUNICIPALITIES.map(area => area.region)).has("Comunidad de Madrid"), false);
  assert.equal(new Set(OTHER_SPANISH_MUNICIPALITIES.map(area => area.region)).has("Comunitat Valenciana"), false);
  assert.equal(new Set(OTHER_SPANISH_MUNICIPALITIES.map(area => area.region)).has("Cataluña"), false);
  const municipalities = [
    ...MADRID_MUNICIPALITIES,
    ...VALENCIAN_MUNICIPALITIES,
    ...CATALAN_MUNICIPALITIES,
    ...OTHER_SPANISH_MUNICIPALITIES,
  ];
  assert.equal(municipalities.length, 8131); // The 8,132nd municipality is Madrid, covered by the 24 legacy city areas.
  assert.equal(new Set(municipalities.map(area => `${area.province}\0${area.municipality}`)).size, municipalities.length);
});

test("the requested regions are scanned in order before Catalonia", () => {
  const source = readFileSync(new URL("../convex/scanPlan.ts", import.meta.url), "utf8");
  const requestedOrder = [
    "Castilla-La Mancha",
    "Castilla y León",
    "Extremadura",
    "Región de Murcia",
    "Andalucía",
  ];
  const configuredOrder = [...source.matchAll(/^\s+"([^"]+)",$/gm)]
    .map(([, region]) => region)
    .filter((region) => requestedOrder.includes(region));

  assert.deepEqual(configuredOrder, requestedOrder);
  assert.match(
    source,
    /\.\.\.municipalitiesBeforeCatalonia\.map\(municipalityArea\),\s+\.\.\.CATALAN_MUNICIPALITIES\.map\(municipalityArea\),\s+\.\.\.remainingSpanishMunicipalities\.map\(municipalityArea\),/,
  );
});

test("successive rounds use different discovery searches", () => {
  const source = readFileSync(new URL("../convex/scanPlan.ts", import.meta.url), "utf8");
  assert.match(source, /DISCOVERY_QUERY_ROUNDS/);
  assert.match(source, /mejores patatas bravas/);
  assert.match(source, /bravioli/);
});
