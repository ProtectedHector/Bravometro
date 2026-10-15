import assert from "node:assert/strict";
import test from "node:test";
import { relevantReviews } from "../src/lib/review-text.ts";
import { filterBravasReviews } from "../src/lib/bravasReviewFilter.ts";

test("the local filter keeps explicit bravas reviews and discards unrelated text", () => {
  const reviews = [
    "Las patatas bravas estaban increíbles",
    "Las bravas tenían una salsa buenísima",
    "Muy buenas las patatas con salsa",
    "Buen servicio y ambiente agradable",
    "La salsa estaba espectacular",
  ];
  const filtered = filterBravasReviews(reviews);
  assert.deepEqual(filtered.relevant, reviews.slice(0, 3));
  assert.deepEqual(filtered.discarded, reviews.slice(3));
  assert.equal(filtered.total, 5);
  assert.equal(filtered.relevantCount, 3);
});

test("the local filter normalizes accents and supports the configured variants", () => {
  const reviews = ["PAPAS BRAVAS", "Patatas picántes", "Great brava sauce", "Solo patatas"];
  assert.deepEqual(filterBravasReviews(reviews).relevant, reviews.slice(0, 3));
});

test("review details are included when the visible snippet is empty", () => {
  const reviews = relevantReviews({
    reviews: [
      {
        review_id: "a",
        snippet: "",
        details: {
          platos_recomendados: "Patatas bravas",
        },
      },
    ],
  });

  assert.deepEqual(reviews, ["Patatas bravas"]);
});

test("snippet and recommended dishes are combined for Gemini context", () => {
  const reviews = relevantReviews({
    reviews: [
      {
        review_id: "b",
        snippet: "Muy buenas.",
        details_platos_recomendados: "Bravas, croquetas",
      },
    ],
  });

  assert.deepEqual(reviews, ["Muy buenas.\nBravas, croquetas"]);
});
