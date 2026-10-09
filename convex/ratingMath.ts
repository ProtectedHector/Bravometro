export type BravasAttributeScores = {
  potato: number;
  sauce: number;
  spiciness: number;
  taste: number;
  texture: number;
  quantity: number;
  value: number;
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
    scores.potato * 0.2 +
      scores.sauce * 0.24 +
      scores.spiciness * 0.1 +
      scores.taste * 0.2 +
      scores.texture * 0.1 +
      scores.quantity * 0.07 +
      scores.value * 0.09,
  );
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
