const BRAVAS_PATTERNS = [
  /\bbravas?\b/i,
  /\bpatatas?\s+bravas?\b/i,
  /\bpapas?\s+bravas?\b/i,
  /\bpatatas?\s+con\s+salsa\b/i,
  /\bpapas?\s+con\s+salsa\b/i,
  /\bbrava\s+sauce\b/i,
  /\bpatatas?\s+picantes?\b/i,
] as const;

export function filterBravasReviews(reviews: string[]) {
  const relevant: string[] = [];
  const discarded: string[] = [];

  for (const review of reviews) {
    const normalized = review
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();

    if (BRAVAS_PATTERNS.some(pattern => pattern.test(normalized))) relevant.push(review);
    else discarded.push(review);
  }

  return { relevant, discarded, total: reviews.length, relevantCount: relevant.length };
}
