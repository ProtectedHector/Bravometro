export type ReviewSourceKey = "manual" | "bravometro-users" | "google" | "tripadvisor" | "yelp" | "foursquare";

export interface ReviewSourceCapabilities {
  canDiscoverPlaces: boolean;
  canFetchReviews: boolean;
  canStoreExcerpts: boolean;
  requiresAttribution: boolean;
}

export interface ReviewSource {
  key: ReviewSourceKey;
  name: string;
  enabled: boolean;
  capabilities: ReviewSourceCapabilities;
}

export const reviewSources: ReviewSource[] = [
  { key: "manual", name: "Manual editorial data", enabled: true, capabilities: { canDiscoverPlaces: false, canFetchReviews: false, canStoreExcerpts: true, requiresAttribution: false } },
  { key: "bravometro-users", name: "Bravómetro users", enabled: false, capabilities: { canDiscoverPlaces: false, canFetchReviews: false, canStoreExcerpts: true, requiresAttribution: true } },
  ...(["google", "tripadvisor", "yelp", "foursquare"] as const).map((key) => ({ key, name: key[0].toUpperCase() + key.slice(1), enabled: false, capabilities: { canDiscoverPlaces: false, canFetchReviews: false, canStoreExcerpts: false, requiresAttribution: true } })),
];
