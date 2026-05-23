import {
  DEFAULT_FEED_SORT_ID,
  EMPTY_FEED_SEARCH_FILTERS,
  type FeedSearchFilters,
  type FeedSortId,
} from "./feedFilters";
import type { LocationKind, ResolvedLocation } from "./location";
import type { PropertyFeature } from "./types";

const PARAM_SORT = "sort";
const PARAM_TYPE = "type";
const PARAM_MIN_PRICE = "minPrice";
const PARAM_MAX_PRICE = "maxPrice";
const PARAM_MIN_ROOMS = "minRooms";
const PARAM_MAX_ROOMS = "maxRooms";
const PARAM_FEATURES = "features";
const PARAM_LOC = "loc";

const VALID_SORT_IDS = new Set<FeedSortId>(["newest", "price_asc", "price_desc"]);
const VALID_LOCATION_KINDS = new Set<LocationKind>(["city", "neighborhood", "street", "area"]);

function parsePositiveNumber(raw: string | null): number | null {
  if (!raw?.trim()) {
    return null;
  }
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function parseLocationParam(raw: string | null): ResolvedLocation | null {
  if (!raw?.trim()) {
    return null;
  }
  try {
    const decoded = decodeURIComponent(raw);
    const data = JSON.parse(decoded) as Record<string, unknown>;
    const placeId = typeof data.placeId === "string" ? data.placeId : "";
    const kind = typeof data.kind === "string" ? data.kind : "";
    const primaryLabel = typeof data.primaryLabel === "string" ? data.primaryLabel : "";
    const secondaryLabel = typeof data.secondaryLabel === "string" ? data.secondaryLabel : "";
    const cityPlaceId = typeof data.cityPlaceId === "string" ? data.cityPlaceId : "";
    const cityLabel = typeof data.cityLabel === "string" ? data.cityLabel : "";

    if (!placeId || !VALID_LOCATION_KINDS.has(kind as LocationKind) || !cityPlaceId || !primaryLabel) {
      return null;
    }

    const location: ResolvedLocation = {
      placeId,
      kind: kind as LocationKind,
      primaryLabel,
      secondaryLabel,
      cityPlaceId,
      cityLabel,
    };

    if (typeof data.neighborhoodPlaceId === "string") {
      location.neighborhoodPlaceId = data.neighborhoodPlaceId;
    }
    if (typeof data.neighborhoodLabel === "string") {
      location.neighborhoodLabel = data.neighborhoodLabel;
    }
    if (typeof data.streetLabel === "string") {
      location.streetLabel = data.streetLabel;
    }
    if (typeof data.districtLabel === "string") {
      location.districtLabel = data.districtLabel;
    }
    if (typeof data.areaPlaceId === "string") {
      location.areaPlaceId = data.areaPlaceId;
    }
    if (typeof data.areaLabel === "string") {
      location.areaLabel = data.areaLabel;
    }
    if (typeof data.lat === "number" && Number.isFinite(data.lat)) {
      location.lat = data.lat;
    }
    if (typeof data.lng === "number" && Number.isFinite(data.lng)) {
      location.lng = data.lng;
    }

    return location;
  } catch {
    return null;
  }
}

function locationToParamValue(location: ResolvedLocation): string {
  const payload: Record<string, unknown> = {
    placeId: location.placeId,
    kind: location.kind,
    primaryLabel: location.primaryLabel,
    secondaryLabel: location.secondaryLabel,
    cityPlaceId: location.cityPlaceId,
    cityLabel: location.cityLabel,
  };
  if (location.neighborhoodPlaceId) payload.neighborhoodPlaceId = location.neighborhoodPlaceId;
  if (location.neighborhoodLabel) payload.neighborhoodLabel = location.neighborhoodLabel;
  if (location.streetLabel) payload.streetLabel = location.streetLabel;
  if (location.districtLabel) payload.districtLabel = location.districtLabel;
  if (location.areaPlaceId) payload.areaPlaceId = location.areaPlaceId;
  if (location.areaLabel) payload.areaLabel = location.areaLabel;
  if (location.lat != null) payload.lat = location.lat;
  if (location.lng != null) payload.lng = location.lng;
  return encodeURIComponent(JSON.stringify(payload));
}

/** ממיר סינון + מיון לפרמטרי URL (לשיתוף ולכפתור «חזור» בדפדפן). */
export function feedFiltersToUrlSearchParams(
  filters: FeedSearchFilters,
  sortId: FeedSortId = DEFAULT_FEED_SORT_ID,
): URLSearchParams {
  const params = new URLSearchParams();

  if (sortId !== DEFAULT_FEED_SORT_ID && VALID_SORT_IDS.has(sortId)) {
    params.set(PARAM_SORT, sortId);
  }
  if (filters.propertyTypeId) {
    params.set(PARAM_TYPE, filters.propertyTypeId);
  }
  if (filters.minPriceIls != null) {
    params.set(PARAM_MIN_PRICE, String(filters.minPriceIls));
  }
  if (filters.maxPriceIls != null) {
    params.set(PARAM_MAX_PRICE, String(filters.maxPriceIls));
  }
  if (filters.minRooms != null) {
    params.set(PARAM_MIN_ROOMS, String(filters.minRooms));
  }
  if (filters.maxRooms != null) {
    params.set(PARAM_MAX_ROOMS, String(filters.maxRooms));
  }
  if (filters.requiredFeatures.length > 0) {
    params.set(PARAM_FEATURES, filters.requiredFeatures.join(","));
  }
  if (filters.location) {
    params.set(PARAM_LOC, locationToParamValue(filters.location));
  }

  return params;
}

export function feedFiltersUrlQueryString(
  filters: FeedSearchFilters,
  sortId: FeedSortId = DEFAULT_FEED_SORT_ID,
): string {
  return feedFiltersToUrlSearchParams(filters, sortId).toString();
}

/** קורא סינון ומיון מכתובת (למשל אחרי חזרה מעמוד מודעה). */
export function feedFiltersFromUrlSearchParams(searchParams: URLSearchParams): {
  filters: FeedSearchFilters;
  sortId: FeedSortId;
} {
  const sortRaw = searchParams.get(PARAM_SORT);
  const sortId: FeedSortId =
    sortRaw && VALID_SORT_IDS.has(sortRaw as FeedSortId) ? (sortRaw as FeedSortId) : DEFAULT_FEED_SORT_ID;

  const featuresRaw = searchParams.get(PARAM_FEATURES);
  const requiredFeatures = (featuresRaw ? featuresRaw.split(",") : []).filter(Boolean) as PropertyFeature[];

  return {
    filters: {
      location: parseLocationParam(searchParams.get(PARAM_LOC)),
      propertyTypeId: searchParams.get(PARAM_TYPE)?.trim() ?? "",
      minPriceIls: parsePositiveNumber(searchParams.get(PARAM_MIN_PRICE)),
      maxPriceIls: parsePositiveNumber(searchParams.get(PARAM_MAX_PRICE)),
      minRooms: parsePositiveNumber(searchParams.get(PARAM_MIN_ROOMS)),
      maxRooms: parsePositiveNumber(searchParams.get(PARAM_MAX_ROOMS)),
      requiredFeatures,
    },
    sortId,
  };
}

export function feedFiltersUrlIsEmpty(searchParams: URLSearchParams): boolean {
  return feedFiltersToUrlSearchParams(EMPTY_FEED_SEARCH_FILTERS).toString() === searchParams.toString();
}
