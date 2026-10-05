export type AnalyticsEvent =
  | "page_view"
  | "search"
  | "place_view"
  | "filter_used"
  | "nearby_requested";

export function track(event: AnalyticsEvent, properties: Record<string, string | number | boolean> = {}): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("bravometro:analytics", { detail: { event, properties } }));
}
