export type BravasAttributeScores = {
  potato: number;
  sauce: number;
  spiciness: number;
  taste: number;
  texture: number;
  quantity: number;
  value: number;
};

export const BRAVAS_SCORE_WEIGHTS: BravasAttributeScores = {
  potato: 0.2,
  sauce: 0.24,
  spiciness: 0.1,
  taste: 0.2,
  texture: 0.1,
  quantity: 0.07,
  value: 0.09,
};

export const BRAVAS_SCORE_FIELDS = [
  "potatoScore",
  "sauceScore",
  "spicinessScore",
  "tasteScore",
  "textureScore",
  "quantityScore",
  "valueScore",
] as const;

export function roundScore(value: number) {
  return Math.round(Math.max(0, Math.min(10, value)) * 10) / 10;
}

export function overallFromScores(scores: BravasAttributeScores) {
  return roundScore(
    scores.potato * BRAVAS_SCORE_WEIGHTS.potato +
      scores.sauce * BRAVAS_SCORE_WEIGHTS.sauce +
      scores.spiciness * BRAVAS_SCORE_WEIGHTS.spiciness +
      scores.taste * BRAVAS_SCORE_WEIGHTS.taste +
      scores.texture * BRAVAS_SCORE_WEIGHTS.texture +
      scores.quantity * BRAVAS_SCORE_WEIGHTS.quantity +
      scores.value * BRAVAS_SCORE_WEIGHTS.value,
  );
}

export function automaticOverallFromScores(scores: Partial<BravasAttributeScores>, evidenceWeights: Record<string, number> = {}) {
  let weightedTotal = 0;
  let coveredWeight = 0;
  for (const [attribute, baseWeight] of Object.entries(BRAVAS_SCORE_WEIGHTS) as Array<[keyof BravasAttributeScores, number]>) {
    if ((evidenceWeights[attribute] ?? 0) <= 0) continue;
    weightedTotal += (scores[attribute] ?? 5) * baseWeight;
    coveredWeight += baseWeight;
  }
  if (coveredWeight <= 0) return 5;
  const evidencedAverage = weightedTotal / coveredWeight;
  return roundScore(5 + (evidencedAverage - 5) * coveredWeight);
}

export function scoresFromRating(row: Record<(typeof BRAVAS_SCORE_FIELDS)[number], number>) {
  return {
    potato: row.potatoScore,
    sauce: row.sauceScore,
    spiciness: row.spicinessScore,
    taste: row.tasteScore,
    texture: row.textureScore,
    quantity: row.quantityScore,
    value: row.valueScore,
  };
}

export function overallFromRating(row: Record<(typeof BRAVAS_SCORE_FIELDS)[number], number>) {
  return overallFromScores(scoresFromRating(row));
}
