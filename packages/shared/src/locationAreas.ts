import areasBank from "../data/israel-city-areas.json";

export interface CityAreaRef {
  id: string;
  name: string;
}

const semelToArea = new Map<string, CityAreaRef>();

for (const area of areasBank.areas) {
  const ref = { id: area.id, name: area.name };
  for (const semel of area.citySemels) {
    if (!semelToArea.has(semel)) {
      semelToArea.set(semel, ref);
    }
  }
}

export function areaForCitySemel(citySemel: string): CityAreaRef | null {
  return semelToArea.get(String(citySemel).trim()) ?? null;
}

export function formatDistrictDisplay(districtRaw: string): string {
  const trimmed = districtRaw.trim();
  if (!trimmed) {
    return "";
  }
  if (trimmed.startsWith("מחוז ")) {
    return trimmed;
  }
  return `מחוז ${trimmed}`;
}
