import type { LocationKind, ResolvedLocation } from "./location";
import { resolvedLocationDisplayLine } from "./location";
import type { RentalListing } from "./types";

/** שדות לשאילתת Firestore לפי מיקום שנבחר בסינון */
export interface FeedLocationQueryFields {
  cityPlaceId: string;
  neighborhoodPlaceId?: string;
  streetPlaceId?: string;
  areaPlaceId?: string;
}

export function feedLocationFilterQueryFields(location: ResolvedLocation): FeedLocationQueryFields {
  const cityPlaceId = location.cityPlaceId.trim();
  if (location.kind === "street") {
    return {
      cityPlaceId,
      streetPlaceId: location.placeId,
    };
  }
  if (location.kind === "neighborhood") {
    const neighborhoodPlaceId = (location.neighborhoodPlaceId ?? location.placeId).trim();
    return { cityPlaceId, neighborhoodPlaceId };
  }
  if (location.kind === "area" && location.areaPlaceId) {
    return { cityPlaceId, areaPlaceId: location.areaPlaceId.trim() };
  }
  if (location.areaPlaceId?.trim()) {
    return { cityPlaceId, areaPlaceId: location.areaPlaceId.trim() };
  }
  return { cityPlaceId };
}

export function feedLocationFilterSummary(location: ResolvedLocation): string {
  return resolvedLocationDisplayLine(location);
}

/** התאמה לקוחית (מודעות ישנות / שדות חסרים) */
export function listingMatchesFeedLocationFilter(
  listing: RentalListing,
  filter: ResolvedLocation,
): boolean {
  const fields = feedLocationFilterQueryFields(filter);
  const listingCityId = listing.cityPlaceId?.trim();
  if (!listingCityId || listingCityId !== fields.cityPlaceId) {
    return false;
  }
  if (fields.streetPlaceId) {
    const streetId = listing.streetPlaceId?.trim() || listing.placeId?.trim();
    return streetId === fields.streetPlaceId;
  }
  if (fields.neighborhoodPlaceId) {
    const neighborhoodId = listing.neighborhoodPlaceId?.trim();
    return neighborhoodId === fields.neighborhoodPlaceId;
  }
  if (fields.areaPlaceId) {
    return listing.areaPlaceId?.trim() === fields.areaPlaceId;
  }
  return true;
}

export function feedLocationFilterKindHint(kind: LocationKind): string {
  switch (kind) {
    case "city":
    case "area":
      return "כל המודעות בעיר/אזור שנבחר";
    case "neighborhood":
      return "מודעות בשכונה שנבחרה";
    case "street":
      return "מודעות ברחוב שנבחר";
    default:
      return "";
  }
}
