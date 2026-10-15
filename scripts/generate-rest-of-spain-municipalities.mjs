import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const workbook = process.argv[2];
if (!workbook) throw new Error("Usage: node scripts/generate-rest-of-spain-municipalities.mjs <diccionario26.xlsx>");

const REGIONS = {
  "01": "Andalucía", "02": "Aragón", "03": "Principado de Asturias", "04": "Illes Balears",
  "05": "Canarias", "06": "Cantabria", "07": "Castilla y León", "08": "Castilla-La Mancha",
  "09": "Cataluña", "10": "Comunitat Valenciana", "11": "Extremadura", "12": "Galicia",
  "13": "Comunidad de Madrid", "14": "Región de Murcia", "15": "Comunidad Foral de Navarra",
  "16": "País Vasco", "17": "La Rioja", "18": "Ceuta", "19": "Melilla",
};

const PROVINCES = {
  "01": "Araba/Álava", "02": "Albacete", "03": "Alicante/Alacant", "04": "Almería", "05": "Ávila",
  "06": "Badajoz", "07": "Illes Balears", "08": "Barcelona", "09": "Burgos", "10": "Cáceres",
  "11": "Cádiz", "12": "Castellón/Castelló", "13": "Ciudad Real", "14": "Córdoba", "15": "A Coruña",
  "16": "Cuenca", "17": "Girona", "18": "Granada", "19": "Guadalajara", "20": "Gipuzkoa",
  "21": "Huelva", "22": "Huesca", "23": "Jaén", "24": "León", "25": "Lleida", "26": "La Rioja",
  "27": "Lugo", "28": "Madrid", "29": "Málaga", "30": "Murcia", "31": "Navarra", "32": "Ourense",
  "33": "Asturias", "34": "Palencia", "35": "Las Palmas", "36": "Pontevedra", "37": "Salamanca",
  "38": "Santa Cruz de Tenerife", "39": "Cantabria", "40": "Segovia", "41": "Sevilla", "42": "Soria",
  "43": "Tarragona", "44": "Teruel", "45": "Toledo", "46": "Valencia/València", "47": "Valladolid",
  "48": "Bizkaia", "49": "Zamora", "50": "Zaragoza", "51": "Ceuta", "52": "Melilla",
};

function unzip(entry) {
  return execFileSync("unzip", ["-p", workbook, entry], { encoding: "utf8", maxBuffer: 10 * 1024 * 1024 });
}

function decodeXml(value) {
  return value
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&apos;/g, "'").replace(/&quot;/g, '"').replace(/&gt;/g, ">").replace(/&lt;/g, "<").replace(/&amp;/g, "&");
}

const sharedStrings = [...unzip("xl/sharedStrings.xml").matchAll(/<si>([\s\S]*?)<\/si>/g)]
  .map(match => decodeXml([...match[1].matchAll(/<t(?: [^>]*)?>([\s\S]*?)<\/t>/g)].map(text => text[1]).join("")));
const municipalities = [];

for (const row of unzip("xl/worksheets/sheet1.xml").matchAll(/<row [^>]*r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g)) {
  if (Number(row[1]) < 3) continue;
  const cells = Object.fromEntries([...row[2].matchAll(/<c [^>]*r="([A-E])\d+"[^>]*t="s"[^>]*><v>(\d+)<\/v><\/c>/g)]
    .map(cell => [cell[1], sharedStrings[Number(cell[2])]]));
  if (!cells.A || !cells.B || !cells.E) throw new Error(`Incomplete municipality row ${row[1]}`);
  if (["09", "10", "13"].includes(cells.A)) continue;
  municipalities.push({ municipality: cells.E, province: PROVINCES[cells.B], region: REGIONS[cells.A] });
}

if (municipalities.length !== 6464 || municipalities.some(area => !area.province || !area.region)) {
  throw new Error(`Expected 6464 mapped municipalities outside Madrid, Valencia and Catalonia; got ${municipalities.length}`);
}

const lines = [
  "// Generated from INE diccionario26.xlsx (municipalities at 1 January 2026).",
  "// Source: https://www.ine.es/daco/daco42/codmun/diccionario26.xlsx",
  'import type { MunicipalityScanArea } from "./scanMunicipalities";',
  "",
  "export const OTHER_SPANISH_MUNICIPALITIES: readonly MunicipalityScanArea[] = [",
  ...municipalities.map(area => `  { municipality: ${JSON.stringify(area.municipality)}, province: ${JSON.stringify(area.province)}, region: ${JSON.stringify(area.region)} },`),
  "] as const;",
  "",
];

writeFileSync(resolve("convex/scanMunicipalitiesRest.ts"), lines.join("\n"));
console.log(`Generated ${municipalities.length} municipalities outside Madrid, Valencia and Catalonia.`);
