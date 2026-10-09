import assert from "node:assert/strict";
import test from "node:test";
import { MAX_REVIEW_PAGES, REVIEW_LIMIT, SCORE_ATTRIBUTES, SERPAPI_HOURLY_LIMIT, SERPAPI_MONTHLY_LIMIT, reviewPageSize, serpapiNextHourStart, serpapiNextMonthStart, serpapiQuotaState, sufficientEvidence } from "../convex/scanLimits.ts";

test("the automatic rating always defines the ten requested aspects", () => {
  assert.deepEqual(SCORE_ATTRIBUTES, ["overall", "potato", "sauce", "texture", "taste", "spiciness", "quantity", "value", "presentation", "originality"]);
});

test("five useful reviews stop additional SerpAPI pages when coverage is sufficient", () => {
  const weights = Object.fromEntries(SCORE_ATTRIBUTES.slice(0, 6).map(key => [key, 1]));
  assert.equal(sufficientEvidence(5, weights), true);
});

test("five generic reviews do not stop collection when coverage is poor", () => {
  assert.equal(sufficientEvidence(5, { overall: 5, taste: 5 }), false);
});

test("the hard cap prevents unbounded review pagination", () => {
  assert.equal(MAX_REVIEW_PAGES, 3);
  assert.equal(REVIEW_LIMIT, 60);
  assert.equal(reviewPageSize(0), 20);
  assert.equal(reviewPageSize(55), 5);
});

test("invalid and missing weights never count as evidence", () => {
  assert.equal(sufficientEvidence(9, { overall: 1, potato: Number.NaN, sauce: 0 }), false);
});

test("SerpAPI quota pauses at the hourly window and resumes next hour", () => {
  const now = Date.UTC(2026, 9, 8, 10, 30);
  const state = serpapiQuotaState({ now, hourStartedAt: Date.UTC(2026, 9, 8, 10), hourRequests: SERPAPI_HOURLY_LIMIT, monthStartedAt: Date.UTC(2026, 9, 1), monthRequests: 1000 });
  assert.equal(state.allowed, false);
  assert.equal(state.pauseReason, "hourly");
  assert.equal(state.pausedUntil, serpapiNextHourStart(now));
});

test("SerpAPI quota pauses for the month after consuming the plan searches", () => {
  const now = Date.UTC(2026, 9, 8, 10, 30);
  const state = serpapiQuotaState({ now, hourStartedAt: Date.UTC(2026, 9, 8, 10), hourRequests: 1, monthStartedAt: Date.UTC(2026, 9, 1), monthRequests: SERPAPI_MONTHLY_LIMIT });
  assert.equal(state.allowed, false);
  assert.equal(state.pauseReason, "monthly");
  assert.equal(state.pausedUntil, serpapiNextMonthStart(now));
});
