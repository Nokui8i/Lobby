import type { NeighborhoodSource } from "./locationLearning";
import { areaForCitySemel, formatDistrictDisplay } from "./locationAreas";

export type { NeighborhoodSource } from "./locationLearning";
export {
  isValidManualNeighborhoodLabel,
  LOCATION_FIELD_HELP_HE,
  NEIGHBORHOOD_LEARNING,
  normalizeNeighborhoodLabelForKey,
} from "./locationLearning";
export { areaForCitySemel, formatDistrictDisplay } from "./locationAreas";
export type { CityAreaRef } from "./locationAreas";

/** סוג ישות מיקום שנבחרה מחיפוש (מאגר מפ"י / data.gov.il) */
export type LocationKind = "city" | "neighborhood" | "street" | "area";

export const LOCATION_KIND_SECTION_HE: Record<LocationKind, string> = {
  city: "עיר",
  neighborhood: "שכונה",
  street: "רחוב",
  area: "אזור",
};

/** הצעה לפני בחירה סופית (Autocomplete) */
export interface LocationSuggestion {
  placeId: string;
  kind: LocationKind;
  primaryText: string;
  secondaryText: string;
}

/** מיקום לאחר Place Details — נשמר במודעה ובסינון */
export interface ResolvedLocation {
  placeId: string;
  kind: LocationKind;
  /** שורה ראשית בתצוגה (למשל שם שכונה או רחוב) */
  primaryLabel: string;
  /** שורת משנה (עיר, מחוז) */
  secondaryLabel: string;
  cityPlaceId: string;
  cityLabel: string;
  neighborhoodPlaceId?: string;
  neighborhoodLabel?: string;
  streetLabel?: string;
  districtLabel?: string;
  areaPlaceId?: string;
  areaLabel?: string;
  neighborhoodSource?: NeighborhoodSource;
  lat?: number;
  lng?: number;
}

/** הקשר מיקום לפרסום אחרי בחירת רחוב */
export interface StreetPublishContext {
  street: ResolvedLocation;
  cityLabel: string;
  districtLabel: string;
  areaPlaceId: string;
  areaLabel: string;
  neighborhoodLabel: string;
  neighborhoodPlaceId?: string;
  neighborhoodSource: NeighborhoodSource;
  neighborhoodLocked: boolean;
  neighborhoodEditable: boolean;
  learnReportCount?: number;
}

export interface ListingLocationFields {
  placeId: string;
  locationKind: LocationKind;
  cityPlaceId: string;
  cityLabel: string;
  neighborhoodPlaceId?: string;
  neighborhoodLabel?: string;
  streetPlaceId?: string;
  districtLabel?: string;
  areaPlaceId?: string;
  areaLabel?: string;
  neighborhoodSource?: NeighborhoodSource;
  lat?: number;
  lng?: number;
}

/** שדות תצוגה/תאימות לאחור ב־Firestore */
export interface ListingLocationLegacyStrings {
  city: string;
  neighborhood: string;
  streetLine: string;
  houseNumber: string;
  streetHint: string;
}

export function resolvedLocationDisplayLine(location: ResolvedLocation): string {
  const primary = location.primaryLabel.trim();
  const city = location.cityLabel.trim();
  if (location.kind === "city" || location.kind === "area") {
    return city || primary;
  }
  if (location.kind === "neighborhood") {
    return city ? `${primary}, ${city}` : primary;
  }
  if (primary && city && primary === city) {
    return city;
  }
  const parts = [primary, city].filter((p) => p.length > 0);
  return parts.join(", ");
}

export function listingLocationFromResolved(
  location: ResolvedLocation,
  houseNumber: string,
): ListingLocationFields & ListingLocationLegacyStrings {
  const streetLine =
    location.kind === "street"
      ? (location.streetLabel ?? location.primaryLabel).trim()
      : (location.streetLabel ?? "").trim();
  const neighborhood = (location.neighborhoodLabel ?? "").trim();
  const city = location.cityLabel.trim();
  const hn = houseNumber.trim();
  const streetHint = [streetLine, hn].filter(Boolean).join(" ").trim();

  return {
    placeId: location.placeId,
    locationKind: location.kind,
    cityPlaceId: location.cityPlaceId,
    cityLabel: city,
    neighborhoodPlaceId: location.neighborhoodPlaceId,
    neighborhoodLabel: neighborhood || undefined,
    streetPlaceId: location.kind === "street" ? location.placeId : undefined,
    districtLabel: location.districtLabel,
    areaPlaceId: location.areaPlaceId,
    areaLabel: location.areaLabel,
    neighborhoodSource: location.neighborhoodSource,
    lat: location.lat,
    lng: location.lng,
    city,
    neighborhood,
    streetLine,
    houseNumber: hn,
    streetHint,
  };
}

export function listingLocationToFirestoreRecord(
  location: ResolvedLocation,
  houseNumber: string,
): Record<string, unknown> {
  const loc = listingLocationFromResolved(location, houseNumber);
  const record: Record<string, unknown> = {
    city: loc.city,
    neighborhood: loc.neighborhood,
    streetLine: loc.streetLine,
    houseNumber: loc.houseNumber,
    streetHint: loc.streetHint,
    placeId: loc.placeId,
    locationKind: loc.locationKind,
    cityPlaceId: loc.cityPlaceId,
  };
  if (loc.neighborhoodPlaceId) {
    record.neighborhoodPlaceId = loc.neighborhoodPlaceId;
  }
  if (loc.streetPlaceId) {
    record.streetPlaceId = loc.streetPlaceId;
  }
  if (loc.districtLabel) {
    record.districtLabel = loc.districtLabel;
  }
  if (loc.areaPlaceId) {
    record.areaPlaceId = loc.areaPlaceId;
  }
  if (loc.areaLabel) {
    record.areaLabel = loc.areaLabel;
  }
  if (loc.neighborhoodSource) {
    record.neighborhoodSource = loc.neighborhoodSource;
  }
  if (typeof loc.lat === "number") {
    record.lat = loc.lat;
  }
  if (typeof loc.lng === "number") {
    record.lng = loc.lng;
  }
  return record;
}

export function rentalListingToResolvedLocation(listing: {
  placeId?: string;
  locationKind?: LocationKind;
  cityPlaceId?: string;
  city: string;
  neighborhood: string;
  streetLine?: string;
  districtLabel?: string;
  areaPlaceId?: string;
  areaLabel?: string;
  neighborhoodPlaceId?: string;
  neighborhoodSource?: NeighborhoodSource;
  lat?: number;
  lng?: number;
}): ResolvedLocation | null {
  if (!listing.placeId || !listing.cityPlaceId) {
    return null;
  }
  const kind = listing.locationKind ?? "street";
  const primaryLabel =
    listing.streetLine?.trim() ||
    listing.neighborhood.trim() ||
    listing.city.trim();
  const secondaryLabel = [listing.city, listing.districtLabel].filter(Boolean).join(" · ");

  return {
    placeId: listing.placeId,
    kind,
    primaryLabel,
    secondaryLabel,
    cityPlaceId: listing.cityPlaceId,
    cityLabel: listing.city,
    neighborhoodPlaceId: listing.neighborhoodPlaceId,
    neighborhoodLabel: listing.neighborhood.trim() || undefined,
    streetLabel: listing.streetLine?.trim() || undefined,
    districtLabel: listing.districtLabel,
    areaPlaceId: listing.areaPlaceId,
    areaLabel: listing.areaLabel,
    neighborhoodSource: listing.neighborhoodSource,
    lat: listing.lat,
    lng: listing.lng,
  };
}

/** אזור/מחוז לפרסום — מהרחוב והעיר, בלי חסימת UI */
export function publishContextFromStreet(street: ResolvedLocation): Pick<
  StreetPublishContext,
  "districtLabel" | "areaPlaceId" | "areaLabel" | "neighborhoodLabel" | "neighborhoodSource"
> {
  const semel = street.cityPlaceId.match(/^il-city-(\d+)$/)?.[1] ?? "";
  const area = areaForCitySemel(semel);
  return {
    districtLabel: formatDistrictDisplay(street.districtLabel ?? ""),
    areaPlaceId: area?.id ?? (semel ? `il-area-city-${semel}` : street.cityPlaceId),
    areaLabel: area?.name ?? street.cityLabel,
    neighborhoodLabel: "",
    neighborhoodSource: "none",
  };
}

/** בונה מיקום מודעה מפרסום רחוב + הקשר שכונה/אזור */
export function buildPublishLocationFromStreet(
  street: ResolvedLocation,
  ctx: Pick<
    StreetPublishContext,
    | "districtLabel"
    | "areaPlaceId"
    | "areaLabel"
    | "neighborhoodLabel"
    | "neighborhoodPlaceId"
    | "neighborhoodSource"
  >,
): ResolvedLocation {
  return {
    ...street,
    kind: "street",
    districtLabel: ctx.districtLabel,
    areaPlaceId: ctx.areaPlaceId,
    areaLabel: ctx.areaLabel,
    neighborhoodLabel: ctx.neighborhoodLabel.trim() || undefined,
    neighborhoodPlaceId: ctx.neighborhoodPlaceId,
    neighborhoodSource: ctx.neighborhoodSource,
    streetLabel: street.primaryLabel,
  };
}

export function publishLocationIsValid(
  location: ResolvedLocation | null,
  houseNumber: string,
): string | null {
  if (!location?.placeId || !location.cityPlaceId) {
    return "נא לבחור רחוב מהרשימה.";
  }
  if (location.kind !== "street") {
    return "נא לבחור רחוב מהרשימה.";
  }
  if (!houseNumber.trim()) {
    return "נא למלא מספר בית.";
  }
  return null;
}
