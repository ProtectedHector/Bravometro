import {
  CATALAN_MUNICIPALITIES,
  MADRID_MUNICIPALITIES,
  VALENCIAN_MUNICIPALITIES,
  type MunicipalityScanArea,
} from "./scanMunicipalities";
import { OTHER_SPANISH_MUNICIPALITIES } from "./scanMunicipalitiesRest";

export type ScanArea = {
  label: string;
  searchLocation: string;
  city: string;
  neighborhood: string;
};

const MADRID_CITY_AREAS = [
  "Centro", "Arganzuela", "Retiro", "Salamanca", "Chamartín",
  "Tetuán", "Chamberí", "Fuencarral-El Pardo", "Moncloa-Aravaca",
  "Latina", "Carabanchel", "Usera", "Puente de Vallecas", "Moratalaz",
  "Ciudad Lineal", "Hortaleza", "Villaverde", "Villa de Vallecas",
  "Vicálvaro", "San Blas-Canillejas", "Barajas",
  "Ensanche de Vallecas", "Casco Histórico de Vallecas", "Santa Eugenia",
] as const;

function municipalityArea(area: MunicipalityScanArea): ScanArea {
  const invertedArticle = area.municipality.match(/^(.+), (El|La|Los|Las|O|A|Os|As|el|la|els|les|o|a|os|as|l')$/);
  const municipality = invertedArticle
    ? `${invertedArticle[2].endsWith("'") ? invertedArticle[2] : `${invertedArticle[2]} `}${invertedArticle[1]}`
    : area.municipality;
  return {
    label: `${municipality} · ${area.region}`,
    searchLocation: `${municipality}, ${area.province}, ${area.region}, España`,
    city: municipality,
    neighborhood: municipality,
  };
}

// Keep the original 24 Madrid city entries first: persisted targets refer to
// their numeric areaIndex. New municipalities must only ever be appended.
export const SCAN_AREAS: readonly ScanArea[] = [
  ...MADRID_CITY_AREAS.map((area) => ({
    label: `${area} · Madrid`,
    searchLocation: `${area}, Madrid, Comunidad de Madrid, España`,
    city: "Madrid",
    neighborhood: area,
  })),
  ...MADRID_MUNICIPALITIES.map(municipalityArea),
  ...VALENCIAN_MUNICIPALITIES.map(municipalityArea),
  ...CATALAN_MUNICIPALITIES.map(municipalityArea),
  ...OTHER_SPANISH_MUNICIPALITIES.map(municipalityArea),
];

export const DISCOVERY_QUERY_ROUNDS = [
  ["patatas bravas", "bravas", "bar de tapas con bravas"],
  ["mejores patatas bravas", "bravas caseras", "raciones de bravas"],
  ["bravioli", "cervecería con bravas", "restaurante con patatas bravas"],
] as const;

export const SCANNER_USER_ID = "jx72bkvz217bgnwv4g3pvvywh98fq64v";
export const SCANNER_VERSION = "bravas-gemini-2.4";
