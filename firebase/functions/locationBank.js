const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { areaForCitySemel, formatDistrictDisplay } = require("./locationAreas");
const {
  getApprovedLearnedForCity,
  learnedHoodId,
  normalizeLabel,
} = require("./locationLearning");

const BANK_PATH = join(__dirname, "data", "israel-location-bank.json");

/** @type {{ cities: object[], streets: object[], neighborhoods?: object[] } | null} */
let bankCache = null;

function loadBank() {
  if (bankCache) {
    return bankCache;
  }
  const raw = readFileSync(BANK_PATH, "utf8");
  bankCache = JSON.parse(raw);
  return bankCache;
}

function normalizeHebrew(text) {
  return String(text ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[\"'״׳]/g, "")
    .replace(/\u05BE/g, "-");
}

function formatDistrictLabel(district) {
  const trimmed = normalizeHebrew(district);
  if (!trimmed) {
    return "";
  }
  if (trimmed.startsWith("מחוז ")) {
    return trimmed;
  }
  return `מחוז ${trimmed}`;
}

function isLobbyPlaceId(placeId) {
  return typeof placeId === "string" && /^il-(city|street|hood)-/.test(placeId.trim());
}

function isLegacyPlaceId(placeId) {
  const id = placeId.trim();
  return /^osm:[NRW]\d+$/i.test(id) || /^ChIJ/i.test(id);
}

function cityToResolved(city) {
  const district = formatDistrictLabel(city.district);
  return {
    placeId: city.id,
    kind: "city",
    primaryLabel: city.name,
    secondaryLabel: district,
    cityPlaceId: city.id,
    cityLabel: city.name,
    districtLabel: city.district || undefined,
  };
}

function hoodToResolved(hood) {
  const district = formatDistrictLabel(hood.district);
  return {
    placeId: hood.id,
    kind: "neighborhood",
    primaryLabel: hood.name,
    secondaryLabel: [hood.cityName, district].filter(Boolean).join(" · "),
    cityPlaceId: hood.cityId,
    cityLabel: hood.cityName,
    neighborhoodPlaceId: hood.id,
    neighborhoodLabel: hood.name,
    districtLabel: hood.district || undefined,
  };
}

function streetToResolved(street) {
  const district = formatDistrictLabel(street.district);
  return {
    placeId: street.id,
    kind: "street",
    primaryLabel: street.name,
    secondaryLabel: [street.cityName, district].filter(Boolean).join(" · "),
    cityPlaceId: street.cityId,
    cityLabel: street.cityName,
    streetLabel: street.name,
    streetPlaceId: street.id,
    districtLabel: street.district || undefined,
  };
}

function suggestionFromResolved(resolved) {
  return {
    placeId: resolved.placeId,
    kind: resolved.kind,
    primaryText: resolved.primaryLabel,
    secondaryText: resolved.secondaryLabel,
  };
}

/** @returns {number} 0 = no match; higher = better */
function matchScore(searchKey, query) {
  if (!query || !searchKey) {
    return 0;
  }
  if (searchKey === query) {
    return 100;
  }
  if (searchKey.startsWith(query)) {
    return 80;
  }
  if (query.length >= 3 && searchKey.includes(query)) {
    return 40;
  }
  return 0;
}

function labelsEqual(a, b) {
  return normalizeHebrew(a) === normalizeHebrew(b);
}

/** רחוב ששמו זהה לשם העיר (נתון רשמי) — לא להציג לפני העיר כשמחפשים את העיר */
function isCityHomonymStreet(street, city) {
  if (!city) {
    return false;
  }
  return street.citySemel === city.semel && labelsEqual(street.name, city.name);
}

/**
 * מוצא סיומת שם עיר (כולל "תל אביב - יפו") והשאר כשם רחוב.
 * @param {string} query
 * @param {{ cities: object[] }} bank
 */
function findStreetCitySuffixSplit(query, bank) {
  const parts = query.split(/\s+/).filter(Boolean);
  if (parts.length < 2) {
    return null;
  }

  let best = null;
  for (let take = Math.min(parts.length - 1, 4); take >= 1; take -= 1) {
    const cityPart = parts.slice(-take).join(" ");
    const streetPart = parts.slice(0, -take).join(" ").trim();
    if (streetPart.length < 2) {
      continue;
    }
    let cityScore = 0;
    for (const city of bank.cities) {
      cityScore = Math.max(cityScore, matchScore(city.searchKey ?? city.name, cityPart));
    }
    if (cityScore >= 40 && (!best || cityScore > best.cityScore || take > best.take)) {
      best = { streetQuery: streetPart, cityQuery: cityPart, cityScore, take };
    }
  }
  return best;
}

/**
 * פירוק חכם: "קרית ביאליק" = עיר שלמה; "הנביאים תל אביב" = רחוב + עיר.
 * @param {string} query
 * @param {{ cities: object[] }} bank
 */
function parseFeedLocationQuery(query, bank) {
  const fullCityRows = bank.cities
    .map((city) => ({
      city,
      score: matchScore(city.searchKey ?? city.name, query),
    }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score);

  const bestFullCityScore = fullCityRows[0]?.score ?? 0;

  if (bestFullCityScore >= 80) {
    return {
      streetQuery: "",
      cityQuery: query,
      fullCityRows,
      preferCityOnly: true,
    };
  }

  const suffixSplit = findStreetCitySuffixSplit(query, bank);
  if (suffixSplit) {
    const firstPartsCityScore = Math.max(
      0,
      ...bank.cities.map((c) => matchScore(c.searchKey ?? c.name, suffixSplit.streetQuery)),
    );
    if (firstPartsCityScore < 80) {
      return {
        streetQuery: suffixSplit.streetQuery,
        cityQuery: suffixSplit.cityQuery,
        fullCityRows,
        preferCityOnly: false,
      };
    }
  }

  const parts = query.split(/\s+/).filter(Boolean);
  if (parts.length < 2) {
    return {
      streetQuery: query,
      cityQuery: "",
      fullCityRows,
      preferCityOnly: false,
    };
  }

  return {
    streetQuery: query,
    cityQuery: "",
    fullCityRows,
    preferCityOnly: bestFullCityScore >= 40,
  };
}

/**
 * @param {string} input
 * @returns {import('./places').LocationSuggestion[]}
 */
function searchLocationBank(input) {
  const bank = loadBank();
  const query = normalizeHebrew(input);
  if (query.length < 2) {
    return [];
  }

  const { streetQuery, cityQuery, fullCityRows, preferCityOnly } = parseFeedLocationQuery(query, bank);
  const citySearchKey = cityQuery || query;
  const streetSearchKey = streetQuery || (preferCityOnly ? "" : query);

  const cityCandidates = (fullCityRows.length > 0 && preferCityOnly
    ? fullCityRows
    : bank.cities
        .map((city) => ({
          city,
          score: matchScore(city.searchKey ?? city.name, citySearchKey),
        }))
        .filter((row) => row.score > 0)
        .sort((a, b) => b.score - a.score)
  ).slice(0, 6);

  const cityHits = cityCandidates.map((row) => row.city);
  const citySemels = new Set(cityHits.map((c) => c.semel));
  const cityBySemel = new Map(cityHits.map((c) => [c.semel, c]));

  for (const row of cityCandidates) {
    citySemels.add(row.city.semel);
    cityBySemel.set(row.city.semel, row.city);
  }

  const streetCandidates = [];
  if (streetSearchKey) {
    for (const street of bank.streets) {
      const key = street.searchKey ?? street.name;
      let score = matchScore(key, streetSearchKey);
      if (score === 0) {
        continue;
      }
      const city = cityBySemel.get(street.citySemel);
      if (preferCityOnly && city && isCityHomonymStreet(street, city)) {
        continue;
      }
      if (cityQuery) {
        const cityPartScore = matchScore(street.cityName, cityQuery);
        if (!citySemels.has(street.citySemel) && cityPartScore === 0) {
          continue;
        }
        score += cityPartScore;
      } else if (preferCityOnly && !citySemels.has(street.citySemel)) {
        continue;
      }
      streetCandidates.push({ street, score });
    }
  }

  streetCandidates.sort((a, b) => b.score - a.score);
  const streetHits = streetCandidates.slice(0, preferCityOnly ? 4 : 10).map((row) => row.street);

  const hoodList = Array.isArray(bank.neighborhoods) ? bank.neighborhoods : [];
  const hoodSearchKey = streetSearchKey || (preferCityOnly ? citySearchKey : query);
  const hoodCandidates = [];
  if (hoodSearchKey) {
    for (const hood of hoodList) {
      const key = hood.searchKey ?? hood.name;
      let score = matchScore(key, hoodSearchKey);
      if (score === 0) {
        continue;
      }
      if (preferCityOnly && !citySemels.has(hood.citySemel)) {
        continue;
      }
      if (cityQuery) {
        const cityPartScore = matchScore(hood.cityName, cityQuery);
        if (!citySemels.has(hood.citySemel) && cityPartScore === 0) {
          continue;
        }
        score += cityPartScore;
      }
      hoodCandidates.push({ hood, score });
    }
  }
  hoodCandidates.sort((a, b) => b.score - a.score);
  const hoodHits = hoodCandidates.slice(0, preferCityOnly ? 6 : 8).map((row) => row.hood);

  const seen = new Set();
  const ranked = [];

  for (const row of cityCandidates) {
    const city = row.city;
    const resolved = cityToResolved(city);
    if (seen.has(resolved.placeId)) {
      continue;
    }
    seen.add(resolved.placeId);
    const base = row.score ?? matchScore(city.searchKey ?? city.name, citySearchKey);
    ranked.push({
      score: base + (preferCityOnly ? 120 : 10),
      suggestion: suggestionFromResolved(resolved),
    });
  }

  for (const street of streetHits) {
    const resolved = streetToResolved(street);
    if (seen.has(resolved.placeId)) {
      continue;
    }
    seen.add(resolved.placeId);

    const city = bank.cities.find((c) => c.id === resolved.cityPlaceId);
    if (city && !seen.has(city.id)) {
      const cityResolved = cityToResolved(city);
      seen.add(cityResolved.placeId);
      ranked.push({
        score: matchScore(city.searchKey ?? city.name, citySearchKey) + 8,
        suggestion: suggestionFromResolved(cityResolved),
      });
    }

    ranked.push({
      score: matchScore(street.searchKey ?? street.name, streetSearchKey),
      suggestion: suggestionFromResolved(resolved),
    });
  }

  for (const hood of hoodHits) {
    const resolved = hoodToResolved(hood);
    if (seen.has(resolved.placeId)) {
      continue;
    }
    seen.add(resolved.placeId);
    ranked.push({
      score: matchScore(hood.searchKey ?? hood.name, hoodSearchKey) + 6,
      suggestion: suggestionFromResolved(resolved),
    });
  }

  const kindOrder = { city: 0, area: 1, neighborhood: 2, street: 3 };
  ranked.sort((a, b) => {
    const ka = kindOrder[a.suggestion.kind] ?? 9;
    const kb = kindOrder[b.suggestion.kind] ?? 9;
    if (ka !== kb) {
      return ka - kb;
    }
    return b.score - a.score;
  });

  return ranked.slice(0, 14).map((row) => row.suggestion);
}

/** חיפוש רחובות בלבד — לפרסום מודעה */
function searchStreetsOnly(input) {
  const bank = loadBank();
  const query = normalizeHebrew(input);
  if (query.length < 2) {
    return [];
  }

  const parts = query.split(/\s+/).filter(Boolean);
  let streetQuery = query;
  let cityQuery = "";

  if (parts.length >= 2) {
    cityQuery = parts[parts.length - 1];
    streetQuery = parts.slice(0, -1).join(" ");
  }

  const cityCandidates = bank.cities
    .map((city) => ({
      city,
      score: matchScore(city.searchKey ?? city.name, cityQuery || query),
    }))
    .filter((row) => row.score > 0);

  const citySemels = new Set(cityCandidates.map((row) => row.city.semel));
  if (cityQuery) {
    for (const row of cityCandidates) {
      if (matchScore(row.city.searchKey ?? row.city.name, cityQuery) > 0) {
        citySemels.add(row.city.semel);
      }
    }
  }

  const streetCandidates = [];
  for (const street of bank.streets) {
    const key = street.searchKey ?? street.name;
    let score = matchScore(key, streetQuery);
    if (score === 0) {
      continue;
    }
    if (cityQuery) {
      const cityPartScore = matchScore(street.cityName, cityQuery);
      if (!citySemels.has(street.citySemel) && cityPartScore === 0) {
        continue;
      }
      score += cityPartScore;
    }
    streetCandidates.push({ street, score });
  }

  streetCandidates.sort((a, b) => b.score - a.score);
  return streetCandidates
    .slice(0, 12)
    .map((row) => suggestionFromResolved(streetToResolved(row.street)));
}

/**
 * @param {string} input
 * @returns {import('./places').LocationSuggestion[]}
 */
function searchCitiesOnly(input) {
  const bank = loadBank();
  const query = normalizeHebrew(input);
  if (query.length < 2) {
    return [];
  }

  const ranked = bank.cities
    .map((city) => ({
      city,
      score: matchScore(city.searchKey ?? city.name, query),
    }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);

  return ranked.map((row) => suggestionFromResolved(cityToResolved(row.city)));
}

/**
 * @param {string} cityPlaceId
 * @returns {import('./places').LocationSuggestion[]}
 */
function listNeighborhoodsForCity(cityPlaceId) {
  const bank = loadBank();
  const city = bank.cities.find((c) => c.id === cityPlaceId.trim());
  if (!city) {
    return [];
  }

  const hoodList = Array.isArray(bank.neighborhoods) ? bank.neighborhoods : [];
  const rows = hoodList
    .filter((hood) => hood.citySemel === city.semel)
    .sort((a, b) => (a.searchKey ?? a.name).localeCompare(b.searchKey ?? b.name, "he"));

  return rows.map((hood) => suggestionFromResolved(hoodToResolved(hood)));
}

/**
 * @param {string} cityPlaceId
 * @param {string} input
 * @returns {Promise<import('./places').LocationSuggestion[]>}
 */
async function searchNeighborhoodsInCity(cityPlaceId, input) {
  const bank = loadBank();
  const city = bank.cities.find((c) => c.id === cityPlaceId.trim());
  if (!city) {
    return [];
  }

  const query = normalizeHebrew(input);
  if (query.length < 1) {
    return [];
  }

  const seen = new Set();
  const ranked = [];
  const hoodList = Array.isArray(bank.neighborhoods) ? bank.neighborhoods : [];

  for (const hood of hoodList) {
    if (hood.citySemel !== city.semel) {
      continue;
    }
    const key = normalizeLabel(hood.name);
    if (seen.has(key)) {
      continue;
    }
    const score = matchScore(hood.searchKey ?? hood.name, query);
    if (score > 0) {
      seen.add(key);
      ranked.push({ hood, score, source: "official" });
    }
  }

  const learned = await getApprovedLearnedForCity(cityPlaceId);
  for (const row of learned) {
    const name = String(row.name ?? "").trim();
    if (!name) {
      continue;
    }
    const key = normalizeLabel(name);
    if (seen.has(key)) {
      continue;
    }
    const score = matchScore(normalizeHebrew(name), query);
    if (score > 0) {
      seen.add(key);
      ranked.push({
        hood: {
          id: row.id ?? learnedHoodId(city.semel, name),
          name,
          cityId: city.id,
          cityName: city.name,
          district: row.districtLabel ?? city.district,
        },
        score: score + 1,
        source: "learned",
      });
    }
  }

  ranked.sort((a, b) => b.score - a.score);
  return ranked.slice(0, 12).map((row) => suggestionFromResolved(hoodToResolved(row.hood)));
}

/**
 * @param {string} cityPlaceId
 * @param {string} input
 * @returns {import('./places').LocationSuggestion[]}
 */
function searchStreetsInCity(cityPlaceId, input) {
  const bank = loadBank();
  const city = bank.cities.find((c) => c.id === cityPlaceId.trim());
  if (!city) {
    return [];
  }

  const query = normalizeHebrew(input);
  if (query.length < 2) {
    return [];
  }

  const ranked = [];
  for (const street of bank.streets) {
    if (street.citySemel !== city.semel) {
      continue;
    }
    const score = matchScore(street.searchKey ?? street.name, query);
    if (score > 0) {
      ranked.push({ street, score });
    }
  }

  ranked.sort((a, b) => b.score - a.score);
  return ranked.slice(0, 12).map((row) => suggestionFromResolved(streetToResolved(row.street)));
}

function resolveLobbyPlaceId(placeId) {
  const bank = loadBank();
  const id = placeId.trim();

  const city = bank.cities.find((c) => c.id === id);
  if (city) {
    return cityToResolved(city);
  }

  const hood = (bank.neighborhoods ?? []).find((h) => h.id === id);
  if (hood) {
    return hoodToResolved(hood);
  }

  const street = bank.streets.find((s) => s.id === id);
  if (street) {
    return streetToResolved(street);
  }

  return null;
}

/**
 * @param {string} streetPlaceId
 * @returns {Promise<object | null>}
 */
async function resolveStreetPublishContext(streetPlaceId) {
  const street = resolveLobbyPlaceId(streetPlaceId);
  if (!street || street.kind !== "street") {
    return null;
  }

  const bank = loadBank();
  const city = bank.cities.find((c) => c.id === street.cityPlaceId);
  if (!city) {
    return null;
  }

  const districtLabel = formatDistrictDisplay(city.district ?? street.districtLabel ?? "");
  const area = areaForCitySemel(city.semel);
  const areaPlaceId = area?.id ?? `il-area-city-${city.semel}`;
  const areaLabel = area?.name ?? city.name;

  return {
    street,
    cityLabel: city.name,
    districtLabel,
    areaPlaceId,
    areaLabel,
    neighborhoodLabel: "",
    neighborhoodPlaceId: undefined,
    neighborhoodSource: "none",
    neighborhoodLocked: false,
    neighborhoodEditable: false,
    learnReportCount: 0,
  };
}

module.exports = {
  loadBank,
  normalizeHebrew,
  isLobbyPlaceId,
  isLegacyPlaceId,
  searchLocationBank,
  searchStreetsOnly,
  searchCitiesOnly,
  listNeighborhoodsForCity,
  searchNeighborhoodsInCity,
  searchStreetsInCity,
  resolveLobbyPlaceId,
  resolveStreetPublishContext,
};
