export const REVIEW_LIMIT = 60;
export const MAX_REVIEW_PAGES = 3;
export const TARGET_USEFUL_REVIEWS = 5;
export const MIN_COVERED_ATTRIBUTES = 6;
export const SERPAPI_HOURLY_LIMIT = 2900;
export const SERPAPI_MONTHLY_LIMIT = 15000;
export const SCORE_ATTRIBUTES = ["overall", "potato", "sauce", "texture", "taste", "spiciness", "quantity", "value", "presentation", "originality"] as const;
export type SerpapiPauseReason = "hourly" | "monthly";

export function reviewLimitReached(reviewCount: number, mentionCount: number) {
  return reviewCount >= REVIEW_LIMIT || mentionCount >= TARGET_USEFUL_REVIEWS;
}

export function reviewPageSize(reviewCount: number) {
  return reviewCount < REVIEW_LIMIT ? Math.min(20, REVIEW_LIMIT - reviewCount) : 20;
}

export function sufficientEvidence(evidenceCount: number, weights: Record<string, number>) {
  return evidenceCount >= TARGET_USEFUL_REVIEWS && SCORE_ATTRIBUTES.filter(key => (weights[key] ?? 0) > 0).length >= MIN_COVERED_ATTRIBUTES;
}

const HOUR_MS = 60 * 60 * 1000;

export function serpapiHourStart(timestamp: number) {
  return Math.floor(timestamp / HOUR_MS) * HOUR_MS;
}

export function serpapiNextHourStart(timestamp: number) {
  return serpapiHourStart(timestamp) + HOUR_MS;
}

export function serpapiMonthStart(timestamp: number) {
  const date = new Date(timestamp);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1);
}

export function serpapiNextMonthStart(timestamp: number) {
  const date = new Date(timestamp);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1);
}

export function serpapiQuotaState(args: {
  now: number;
  hourStartedAt?: number;
  hourRequests?: number;
  monthStartedAt?: number;
  monthRequests?: number;
}) {
  const hourStartedAt = serpapiHourStart(args.now);
  const monthStartedAt = serpapiMonthStart(args.now);
  const hourRequests = args.hourStartedAt === hourStartedAt ? args.hourRequests ?? 0 : 0;
  const monthRequests = args.monthStartedAt === monthStartedAt ? args.monthRequests ?? 0 : 0;
  if (monthRequests >= SERPAPI_MONTHLY_LIMIT) return { allowed: false as const, hourStartedAt, hourRequests, monthStartedAt, monthRequests,
    pausedUntil: serpapiNextMonthStart(args.now), pauseReason: "monthly" as const };
  if (hourRequests >= SERPAPI_HOURLY_LIMIT) return { allowed: false as const, hourStartedAt, hourRequests, monthStartedAt, monthRequests,
    pausedUntil: serpapiNextHourStart(args.now), pauseReason: "hourly" as const };
  return { allowed: true as const, hourStartedAt, hourRequests, monthStartedAt, monthRequests };
}
