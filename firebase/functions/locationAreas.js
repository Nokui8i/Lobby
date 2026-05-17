const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const AREAS_PATH = join(__dirname, "data", "israel-city-areas.json");

/** @type {Map<string, { id: string, name: string }> | null} */
let semelToArea = null;

function loadAreas() {
  if (semelToArea) {
    return semelToArea;
  }
  const raw = JSON.parse(readFileSync(AREAS_PATH, "utf8"));
  semelToArea = new Map();
  for (const area of raw.areas ?? []) {
    const ref = { id: area.id, name: area.name };
    for (const semel of area.citySemels ?? []) {
      if (!semelToArea.has(String(semel))) {
        semelToArea.set(String(semel), ref);
      }
    }
  }
  return semelToArea;
}

function areaForCitySemel(citySemel) {
  return loadAreas().get(String(citySemel).trim()) ?? null;
}

function formatDistrictDisplay(districtRaw) {
  const trimmed = String(districtRaw ?? "").trim();
  if (!trimmed) {
    return "";
  }
  if (trimmed.startsWith("מחוז ")) {
    return trimmed;
  }
  return `מחוז ${trimmed}`;
}

module.exports = { areaForCitySemel, formatDistrictDisplay };
