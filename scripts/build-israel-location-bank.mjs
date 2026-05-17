/**
 * בונה מאגר מיקום רשמי ללובי מ-data.gov.il (ישובים + רחובות בישראל).
 *
 * פלט:
 *   packages/shared/data/israel-location-bank.json
 *   firebase/functions/data/israel-location-bank.json
 *
 * הרצה: node scripts/build-israel-location-bank.mjs
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  linkNeighborhoodRows,
  parseGovMapNeighborhoodExport,
} from "./lib/neighborhoods.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

/** יישובים — למ"ס / רשות האוכלוסין */
const CITIES_RESOURCE = "b7cf8f14-64a2-4b33-8d4b-edb286fdbd37";
/** רחובות — רשימת רחובות בישראל (מתעדכן), רשות האוכלוסין */
const STREETS_RESOURCE = "9ad3862c-8391-4b2f-84a4-2d4c68625f4b";
const STREETS_DATASET_URL =
  "https://data.gov.il/he/datasets/population_authority/321/9ad3862c-8391-4b2f-84a4-2d4c68625f4b";
const PAGE_SIZE = 32000;

function normalizeHebrew(text) {
  return String(text ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[\"'״׳]/g, "")
    .replace(/\u05BE/g, "-");
}

function cityId(semel) {
  return `il-city-${semel}`;
}

function streetId(cityCode, officialCode) {
  return `il-street-${cityCode}-${officialCode}`;
}

async function fetchAllRecords(resourceId) {
  const firstUrl = `https://data.gov.il/api/3/action/datastore_search?resource_id=${resourceId}&limit=${PAGE_SIZE}`;
  const first = await fetch(firstUrl);
  if (!first.ok) {
    throw new Error(`data.gov.il failed ${first.status} for ${resourceId}`);
  }
  const firstJson = await first.json();
  if (!firstJson.success) {
    throw new Error(firstJson.error?.message ?? "datastore_search failed");
  }

  const total = firstJson.result.total;
  const records = [...firstJson.result.records];
  let offset = records.length;

  while (offset < total) {
    const url = `${firstUrl}&offset=${offset}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`data.gov.il page failed ${res.status} offset=${offset}`);
    }
    const json = await res.json();
    records.push(...json.result.records);
    offset += json.result.records.length;
    process.stdout.write(`\r  ${resourceId}: ${offset}/${total}`);
  }
  process.stdout.write("\n");
  return records;
}

function buildCities(raw) {
  const cities = [];
  const bySemel = new Map();

  for (const row of raw) {
    const semel = Number(row.סמל_ישוב);
    const name = normalizeHebrew(row.שם_ישוב);
    if (!semel || !name) {
      continue;
    }
    const district = normalizeHebrew(row.שם_נפה);
    const entry = {
      id: cityId(semel),
      kind: "city",
      name,
      district,
      semel: String(semel),
      searchKey: name,
    };
    cities.push(entry);
    bySemel.set(semel, entry);
  }

  cities.sort((a, b) => a.searchKey.localeCompare(b.searchKey, "he"));
  return { cities, bySemel };
}

function parseStreetsCsv(filePath) {
  const text = readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
  const lines = text.split(/\r?\n/).filter(Boolean);
  const rows = [];
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (i === 0 && line.includes("סמל_ישוב")) {
      continue;
    }
    const parts = line.split(",").map((p) => p.trim());
    if (parts.length < 4) {
      continue;
    }
    rows.push({
      סמל_ישוב: Number(parts[0]),
      שם_ישוב: parts[1],
      סמל_רחוב: Number(parts[2]),
      שם_רחוב: parts[3],
    });
  }
  return rows;
}

function buildStreets(raw, bySemel) {
  const seen = new Set();
  const streets = [];

  for (const row of raw) {
    const cityCode = Number(row.סמל_ישוב ?? row.city_code);
    const streetCode = Number(row.סמל_רחוב ?? row.official_code ?? row.street_code);
    const streetName = normalizeHebrew(row.שם_רחוב ?? row.street_name);
    const cityName = normalizeHebrew(row.שם_ישוב ?? row.city_name);

    if (!cityCode || !streetCode || !streetName || !cityName) {
      continue;
    }

    const dedupeKey = `${cityCode}:${streetCode}`;
    if (seen.has(dedupeKey)) {
      continue;
    }
    seen.add(dedupeKey);

    const city = bySemel.get(cityCode);
    const district = city?.district ?? "";

    streets.push({
      id: streetId(cityCode, streetCode),
      kind: "street",
      name: streetName,
      citySemel: String(cityCode),
      cityName: city?.name ?? cityName,
      cityId: city?.id ?? cityId(cityCode),
      district,
      searchKey: streetName,
    });
  }

  streets.sort((a, b) => a.searchKey.localeCompare(b.searchKey, "he"));
  return streets;
}

async function main() {
  const streetsCsvArg = process.argv.find((a) => a.startsWith("--streets-csv="));
  const streetsCsvPath = streetsCsvArg?.slice("--streets-csv=".length);

  console.log("Fetching cities (CBS localities)…");
  const cityRows = await fetchAllRecords(CITIES_RESOURCE);
  const { cities, bySemel } = buildCities(cityRows);
  console.log(`Cities: ${cities.length}`);

  let streetRows;
  if (streetsCsvPath) {
    console.log(`Loading streets from CSV: ${streetsCsvPath}`);
    streetRows = parseStreetsCsv(streetsCsvPath);
  } else {
    console.log(`Fetching streets (${STREETS_DATASET_URL})…`);
    streetRows = await fetchAllRecords(STREETS_RESOURCE);
  }
  const streets = buildStreets(streetRows, bySemel);
  console.log(`Streets: ${streets.length}`);

  let neighborhoods = [];
  const hoodJsonArg =
    process.argv.find((a) => a.startsWith("--govmap-neighborhoods-json=")) ??
    process.argv.find((a) => a.startsWith("--neighborhoods-json="));
  const hoodJsonPath = hoodJsonArg?.includes("govmap")
    ? hoodJsonArg.slice("--govmap-neighborhoods-json=".length)
    : hoodJsonArg?.slice("--neighborhoods-json=".length);
  if (hoodJsonPath) {
    console.log(`Loading neighborhoods from GovMap export: ${hoodJsonPath}`);
    const raw = JSON.parse(readFileSync(hoodJsonPath, "utf8"));
    const rows = parseGovMapNeighborhoodExport(raw);
    const linked = linkNeighborhoodRows(rows, cities);
    neighborhoods = linked.neighborhoods;
    console.log(
      `Neighborhoods: ${neighborhoods.length} (skipped ${linked.unmatchedCities} rows — city name not in CBS list)`,
    );
  } else {
    console.log(
      "Neighborhoods: skipped (use --govmap-neighborhoods-json=… after GovMap getLayerEntities export)",
    );
  }

  const bank = {
    version: 3,
    source:
      "data.gov.il: CBS יישובים + רחובות (רשות האוכלוסין) + שכונות (israel-neighborhoods-seed.json)",
    updatedAt: new Date().toISOString().slice(0, 10),
    cities,
    streets,
    neighborhoods,
  };

  const json = JSON.stringify(bank);
  const targets = [
    join(ROOT, "packages/shared/data/israel-location-bank.json"),
    join(ROOT, "firebase/functions/data/israel-location-bank.json"),
  ];

  for (const path of targets) {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, json, "utf8");
    console.log("Wrote", path, `(${(json.length / 1024 / 1024).toFixed(2)} MB)`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
