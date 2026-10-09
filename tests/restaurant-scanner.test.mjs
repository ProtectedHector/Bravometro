import assert from "node:assert/strict";
import test from "node:test";
import { relevantReviews } from "../src/lib/review-text.ts";

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
