/**
 * מיזוג שכונות מ-GovMap (שכבה Neighborhood / lay=310) לבנק המיקום.
 *
 * ייצוא חד-פעמי (דורש מפתח GovMap מ-https://api.govmap.gov.il):
 *   govmap.getLayerEntities({ layerName: 'Neighborhood', token: '...' })
 * שמור את התשובה כ-JSON והרץ:
 *   node scripts/build-israel-location-bank.mjs --govmap-neighborhoods-json=path/to/neighborhoods.json
 */

function normalizeHebrew(text) {
  return String(text ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[\"'״׳]/g, "")
    .replace(/\u05BE/g, "-")
    .replace(/[()]/g, "");
}

function normalizeCityKey(name) {
  let key = normalizeHebrew(name);
  key = key.replace(/\s*-\s*/g, "-");
  key = key.replace(/^מועצה אזורית\s+/, "");
  key = key.replace(/^מועצה מקומית\s+/, "");
  key = key.replace(/^קריית\s+/, "");
  key = key.replace(/^קרית\s+/, "");
  key = key.replace(/^התנחלות\s+/, "");
  return key;
}

/** שמות יישוב ב-seed שלא תואמים 1:1 ל-CBS */
const CITY_NAME_ALIASES = new Map([
  [normalizeCityKey("תל אביב -יפו"), normalizeCityKey("תל אביב-יפו")],
  [normalizeCityKey("באקה אל-גרבייה"), normalizeCityKey("באקה אל-גרביה")],
  [normalizeCityKey("יהוד-מונוסון"), normalizeCityKey("יהוד מונוסון")],
  [
    normalizeCityKey("מודיעין-מכבים-רעות"),
    normalizeCityKey("מודיעין מכבים רעות"),
  ],
  [normalizeCityKey("נצרת עילית"), normalizeCityKey("נוף הגליל")],
]);

function slugForId(text) {
  return normalizeHebrew(text)
    .replace(/[^\p{L}\p{N}-]+/gu, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

export function hoodId(citySemel, hoodName) {
  const slug = slugForId(hoodName) || "hood";
  return `il-hood-${citySemel}-${slug}`;
}

function fieldValue(fields, candidates) {
  if (!Array.isArray(fields)) {
    return "";
  }
  const lowered = candidates.map((c) => c.toLowerCase());
  for (const field of fields) {
    const name = String(field.FieldName ?? field.fieldName ?? "").toLowerCase();
    const caption = String(field.Caption ?? field.caption ?? "").toLowerCase();
    if (lowered.some((c) => name.includes(c) || caption.includes(c))) {
      return String(field.Value ?? field.value ?? "").trim();
    }
  }
  return "";
}

/**
 * @param {unknown} raw — מערך ישויות GovMap או [{ cityName, name }]
 */
export function parseGovMapNeighborhoodExport(raw) {
  const list = Array.isArray(raw) ? raw : raw?.entities ?? raw?.data ?? [];
  const rows = [];

  for (const item of list) {
    if (item?.cityName && item?.name) {
      rows.push({
        cityName: normalizeHebrew(item.cityName),
        hoodName: normalizeHebrew(item.name),
        govmapEntityId: item.entityID ?? item.entityId ?? undefined,
      });
      continue;
    }

    const fields = item?.Fields ?? item?.fields ?? [];
    const cityName = normalizeHebrew(
      fieldValue(fields, ["שם_ישוב", "yeshuv", "city", "ישוב"]) ||
        item?.cityName ||
        item?.שם_ישוב,
    );
    const hoodName = normalizeHebrew(
      fieldValue(fields, ["שם_שכונה", "neighborhood", "שכונה", "שם"]) ||
        item?.hoodName ||
        item?.שם_שכונה,
    );

    if (!cityName || !hoodName || hoodName === cityName) {
      continue;
    }

    rows.push({
      cityName,
      hoodName,
      govmapEntityId: item?.entityID ?? item?.entityId,
    });
  }

  return rows;
}

export function buildCityNameIndex(cities) {
  const index = new Map();
  for (const city of cities) {
    const keys = new Set([
      normalizeCityKey(city.name),
      normalizeHebrew(city.name),
    ]);
    for (const key of keys) {
      if (key && !index.has(key)) {
        index.set(key, city);
      }
    }
  }
  return index;
}

function resolveCity(cityName, cityIndex, cities) {
  const key = normalizeCityKey(cityName);
  const direct =
    cityIndex.get(key) ?? cityIndex.get(normalizeHebrew(cityName));
  if (direct) {
    return direct;
  }
  const aliasKey = CITY_NAME_ALIASES.get(key);
  if (aliasKey) {
    const aliased = cityIndex.get(aliasKey);
    if (aliased) {
      return aliased;
    }
  }
  for (const city of cities) {
    const cityKey = normalizeCityKey(city.name);
    if (cityKey === key || cityKey.includes(key) || key.includes(cityKey)) {
      return city;
    }
  }
  return null;
}

export function linkNeighborhoodRows(rows, cities) {
  const cityIndex = buildCityNameIndex(cities);
  const seen = new Set();
  const neighborhoods = [];
  let unmatchedCities = 0;

  for (const row of rows) {
    const city = resolveCity(row.cityName, cityIndex, cities);
    if (!city) {
      unmatchedCities += 1;
      continue;
    }

    const dedupe = `${city.semel}:${row.hoodName}`;
    if (seen.has(dedupe)) {
      continue;
    }
    seen.add(dedupe);

    neighborhoods.push({
      id: hoodId(city.semel, row.hoodName),
      kind: "neighborhood",
      name: row.hoodName,
      citySemel: city.semel,
      cityName: city.name,
      cityId: city.id,
      district: city.district ?? "",
      searchKey: row.hoodName,
      govmapEntityId: row.govmapEntityId,
    });
  }

  neighborhoods.sort((a, b) => a.searchKey.localeCompare(b.searchKey, "he"));
  return { neighborhoods, unmatchedCities };
}
