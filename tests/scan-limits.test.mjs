import assert from "node:assert/strict";
import test from "node:test";
import { MAX_REVIEW_PAGES, REVIEW_LIMIT, SCORE_ATTRIBUTES, SERPAPI_HOURLY_LIMIT, SERPAPI_MONTHLY_LIMIT, reviewPageSize, serpapiNextHourStart, serpapiNextMonthStart, serpapiProviderPauseUntil, serpapiQuotaState, sufficientEvidence } from "../convex/scanLimits.ts";
import { automaticOverallFromScores } from "../convex/ratingMath.ts";

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

test("neutral automatic attributes do not inflate the overall score", () => {
  assert.equal(automaticOverallFromScores({ potato: 5, sauce: 5, spiciness: 5, taste: 5, texture: 5, quantity: 5, value: 5 }, {}), 5);
});

test("sparse automatic evidence is pulled back toward neutral", () => {
  assert.equal(automaticOverallFromScores({ potato: 5, sauce: 10, spiciness: 5, taste: 5, texture: 5, quantity: 5, value: 5 }, { sauce: 1 }), 6.2);
});

test("complete exceptional automatic evidence can still reach the top score", () => {
  assert.equal(automaticOverallFromScores({ potato: 10, sauce: 10, spiciness: 10, taste: 10, texture: 10, quantity: 10, value: 10 }, { potato: 1, sauce: 1, spiciness: 1, taste: 1, texture: 1, quantity: 1, value: 1 }), 10);
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

test("a provider hourly limit remains paused for a full hour and then resumes", () => {
  const now = Date.UTC(2026, 9, 8, 10, 30);
  const pausedUntil = serpapiProviderPauseUntil(now, "hourly");
  const paused = serpapiQuotaState({ now, hourRequests: 20, monthRequests: 1000, pausedUntil, pauseReason: "hourly" });
  assert.equal(paused.allowed, false);
  assert.equal(paused.pausedUntil, now + 60 * 60 * 1000);
  assert.equal(serpapiQuotaState({ now: pausedUntil, hourRequests: 20, monthRequests: 1000, pausedUntil, pauseReason: "hourly" }).allowed, true);
});
