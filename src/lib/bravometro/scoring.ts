import type { ConfidenceLevel, DishScores } from "@/lib/types";

export const METHODOLOGY_VERSION = "1.0";

const WEIGHTS: Record<keyof Omit<DishScores, "overall">, number> = {
  potato: 0.2,
  sauce: 0.24,
  spiciness: 0.1,
  taste: 0.2,
  texture: 0.1,
  quantity: 0.07,
  value: 0.09,
};

export function roundScore(score: number): number {
  return Math.round(Math.max(0, Math.min(10, score)) * 10) / 10;
}

export function calculateOverallScore(scores: Omit<DishScores, "overall">): number {
  return roundScore(
    Object.entries(WEIGHTS).reduce(
      (total, [attribute, weight]) => total + scores[attribute as keyof typeof scores] * weight,
      0,
    ),
  );
}

export function calculateConfidence(evidenceCount: number, sourceCount = 1): number {
  const evidenceFactor = Math.min(evidenceCount / 40, 1) * 75;
  const sourceFactor = Math.min(sourceCount / 3, 1) * 25;
  return Math.round(evidenceFactor + sourceFactor);
}

export function confidenceLevel(score: number): ConfidenceLevel {
  if (score >= 72) return "high";
  if (score >= 42) return "medium";
  return "low";
}

export function formatScore(score: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(score);
}
