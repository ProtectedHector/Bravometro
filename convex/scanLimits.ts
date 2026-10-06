export const REVIEW_LIMIT = 500;

export function reviewLimitReached(reviewCount: number, mentionCount: number) {
  return reviewCount >= REVIEW_LIMIT && mentionCount > 0;
}

export function reviewPageSize(reviewCount: number) {
  return reviewCount < REVIEW_LIMIT ? Math.min(20, REVIEW_LIMIT - reviewCount) : 20;
}
