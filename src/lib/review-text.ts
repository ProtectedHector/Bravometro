type JsonObject = Record<string, unknown>;

const object = (value: unknown): JsonObject => value !== null && typeof value === "object" && !Array.isArray(value) ? value as JsonObject : {};
const string = (value: unknown) => typeof value === "string" ? value : "";

export function relevantReviews(data: JsonObject) {
  const reviews = Array.isArray(data.reviews) ? data.reviews : [];
  const seen = new Set<string>();
  return reviews.flatMap(value => {
    const review = object(value);
    const text = reviewText(review);
    const key = string(review.review_id) || text;
    if (!text.trim() || seen.has(key)) return [];
    seen.add(key);
    return [text];
  });
}

function reviewText(review: JsonObject) {
  const parts = [
    string(object(review.extracted_snippet).original) || string(review.snippet),
    ...reviewDetailTexts(review),
  ].map(part => part.trim()).filter(Boolean);
  return parts.join("\n");
}

function reviewDetailTexts(review: JsonObject) {
  const details = object(review.details);
  const values: string[] = [];
  for (const [key, value] of Object.entries({ ...review, ...details })) {
    const normalizedKey = key.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    if (!/(platos|recomend|dish|food|comida|menu|pedido)/.test(normalizedKey)) continue;
    collectStrings(value, values);
  }
  return values;
}

function collectStrings(value: unknown, output: string[]) {
  if (typeof value === "string") {
    if (value.trim()) output.push(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectStrings(item, output);
    return;
  }
  if (value !== null && typeof value === "object") {
    for (const item of Object.values(value as Record<string, unknown>)) collectStrings(item, output);
  }
}
