export type MapViewState = {
  latitude: number;
  longitude: number;
  zoom: number;
  selectedPlaceId?: string;
};

type SearchParamsReader = Pick<URLSearchParams, "get">;

export function readMapViewState(params: SearchParamsReader): MapViewState | undefined {
  const rawLatitude = params.get("lat");
  const rawLongitude = params.get("lng");
  const rawZoom = params.get("zoom");
  if (rawLatitude === null || rawLongitude === null || rawZoom === null) return undefined;

  const latitude = Number(rawLatitude);
  const longitude = Number(rawLongitude);
  const zoom = Number(rawZoom);

  if (
    !Number.isFinite(latitude) || latitude < -90 || latitude > 90 ||
    !Number.isFinite(longitude) || longitude < -180 || longitude > 180 ||
    !Number.isFinite(zoom) || zoom < 1 || zoom > 22
  ) return undefined;

  const selectedPlaceId = params.get("place")?.trim() || undefined;
  return { latitude, longitude, zoom, selectedPlaceId };
}

export function buildMapHref(locale: string, state: MapViewState): string {
  const params = new URLSearchParams({
    lat: state.latitude.toFixed(6),
    lng: state.longitude.toFixed(6),
    zoom: String(Math.round(state.zoom)),
  });
  if (state.selectedPlaceId) params.set("place", state.selectedPlaceId);
  return `/${locale}/mapa?${params.toString()}`;
}

export function buildPlaceHref(locale: string, slug: string, mapHref: string): string {
  const params = new URLSearchParams({ from: mapHref });
  return `/${locale}/bravas/${slug}?${params.toString()}`;
}

export function getPlaceBackHref(locale: string, from?: string): string {
  const fallback = `/${locale}/bravas`;
  if (!from?.startsWith("/")) return fallback;

  try {
    const url = new URL(from, "https://bravometro.local");
    if (url.origin !== "https://bravometro.local" || url.pathname !== `/${locale}/mapa`) return fallback;
    return `${url.pathname}${url.search}`;
  } catch {
    return fallback;
  }
}
