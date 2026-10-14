import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  CATALAN_MUNICIPALITIES,
  MADRID_MUNICIPALITIES,
  VALENCIAN_MUNICIPALITIES,
} from "../convex/scanMunicipalities.ts";

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

test("successive rounds use different discovery searches", () => {
  const source = readFileSync(new URL("../convex/scanPlan.ts", import.meta.url), "utf8");
  assert.match(source, /DISCOVERY_QUERY_ROUNDS/);
  assert.match(source, /mejores patatas bravas/);
  assert.match(source, /bravioli/);
});
