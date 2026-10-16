import assert from "node:assert/strict";
import test from "node:test";
import {
  isPermanentlyClosedBusinessStatus,
  isPermanentlyClosedGoogleMapsResult,
} from "../src/lib/place-business-status.ts";

test("recognizes Google Places permanent closure status", () => {
  assert.equal(isPermanentlyClosedBusinessStatus("CLOSED_PERMANENTLY"), true);
  assert.equal(isPermanentlyClosedBusinessStatus("CLOSED_TEMPORARILY"), false);
  assert.equal(isPermanentlyClosedBusinessStatus("OPERATIONAL"), false);
});

test("recognizes permanent closure in SerpAPI Google Maps results", () => {
  assert.equal(isPermanentlyClosedGoogleMapsResult({ permanently_closed: true }), true);
  assert.equal(isPermanentlyClosedGoogleMapsResult({ open_state: "Cerrado permanentemente" }), true);
  assert.equal(isPermanentlyClosedGoogleMapsResult({ hours: "Permanently closed" }), true);
  assert.equal(isPermanentlyClosedGoogleMapsResult({ open_state: "Cerrado · Abre a las 09:00" }), false);
  assert.equal(isPermanentlyClosedGoogleMapsResult({ open_state: "Closed · Opens 9 AM" }), false);
});
