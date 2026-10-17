import {
  CATALAN_MUNICIPALITIES,
  MADRID_MUNICIPALITIES,
  VALENCIAN_MUNICIPALITIES,
  type MunicipalityScanArea,
} from "../../convex/scanMunicipalities";
import { OTHER_SPANISH_MUNICIPALITIES } from "../../convex/scanMunicipalitiesRest";
import type { Place } from "@/lib/types";

const INVERTED_ARTICLE = /^(.+), (El|La|Los|Las|O|A|Os|As|el|la|els|les|o|a|os|as|l')$/;

function displayMunicipality(municipality: string): string {
  const inverted = municipality.match(INVERTED_ARTICLE);
  if (!inverted) return municipality;
  return `${inverted[2].endsWith("'") ? inverted[2] : `${inverted[2]} `}${inverted[1]}`;
}

function cityKeys(municipality: string): string[] {
  const displayName = displayMunicipality(municipality);
  return [displayName, ...displayName.split("/")].map((name) => name.trim().toLocaleLowerCase("es"));
}

const municipalityRegions = new Map<string, string>();
const municipalities: readonly MunicipalityScanArea[] = [
  ...MADRID_MUNICIPALITIES,
  ...VALENCIAN_MUNICIPALITIES,
  ...CATALAN_MUNICIPALITIES,
  ...OTHER_SPANISH_MUNICIPALITIES,
];

municipalityRegions.set("madrid", "Comunidad de Madrid");
for (const municipality of municipalities) {
  for (const key of cityKeys(municipality.municipality)) {
    if (!municipalityRegions.has(key)) municipalityRegions.set(key, municipality.region);
  }
}

export function addRegionsToPlaces(places: Place[]): Place[] {
  return places.map((place) => ({
    ...place,
    region: municipalityRegions.get(place.city.trim().toLocaleLowerCase("es")),
  }));
}
