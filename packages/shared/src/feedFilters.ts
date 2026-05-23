import { listingMatchesFeedLocationFilter } from "./feedLocationFilter";
import { featureLabels } from "./mockListings";
import type { ResolvedLocation } from "./location";
import type { PropertyFeature, RentalListing } from "./types";

export interface FeedSearchFilters {
  location: ResolvedLocation | null;
  propertyTypeId: string;
  minPriceIls: number | null;
  maxPriceIls: number | null;
  minRooms: number | null;
  maxRooms: number | null;
  /** כל מאפיין שנבחר חייב להופיע במודעה (AND) */
  requiredFeatures: PropertyFeature[];
}

export const EMPTY_FEED_SEARCH_FILTERS: FeedSearchFilters = {
  location: null,
  propertyTypeId: "",
  minPriceIls: null,
  maxPriceIls: null,
  minRooms: null,
  maxRooms: null,
  requiredFeatures: [],
};

export const FEED_FEATURE_FILTER_OPTIONS: { id: PropertyFeature; label: string }[] = (
  Object.entries(featureLabels) as [PropertyFeature, string][]
).map(([id, label]) => ({ id, label }));

export function toggleFeedRequiredFeature(
  current: PropertyFeature[],
  feature: PropertyFeature,
): PropertyFeature[] {
  return current.includes(feature) ? current.filter((f) => f !== feature) : [...current, feature];
}

export function feedRequiredFeaturesSummary(features: PropertyFeature[]): string {
  if (features.length === 0) {
    return "";
  }
  return features.map((f) => featureLabels[f] ?? f).join(" · ");
}

export type FeedRoomFilterOption = {
  id: string;
  label: string;
  minRooms: number | null;
  maxRooms: number | null;
};

export const FEED_ROOM_FILTER_OPTIONS: FeedRoomFilterOption[] = [
  { id: "", label: "חדרים", minRooms: null, maxRooms: null },
  { id: "1", label: "1", minRooms: 1, maxRooms: 1 },
  { id: "1.5", label: "1.5", minRooms: 1.5, maxRooms: 1.5 },
  { id: "2", label: "2", minRooms: 2, maxRooms: 2 },
  { id: "2.5", label: "2.5", minRooms: 2.5, maxRooms: 2.5 },
  { id: "3", label: "3", minRooms: 3, maxRooms: 3 },
  { id: "4", label: "4", minRooms: 4, maxRooms: 4 },
  { id: "5+", label: "5+", minRooms: 5, maxRooms: null },
];

export function feedRoomFilterIdFromFilters(filters: FeedSearchFilters): string {
  const hit = FEED_ROOM_FILTER_OPTIONS.find(
    (o) => o.minRooms === filters.minRooms && o.maxRooms === filters.maxRooms,
  );
  return hit?.id ?? (filters.minRooms != null || filters.maxRooms != null ? "custom" : "");
}

export function feedSearchFiltersFromRoomId(roomId: string): Pick<FeedSearchFilters, "minRooms" | "maxRooms"> {
  const opt = FEED_ROOM_FILTER_OPTIONS.find((o) => o.id === roomId);
  if (!opt) {
    return { minRooms: null, maxRooms: null };
  }
  return { minRooms: opt.minRooms, maxRooms: opt.maxRooms };
}

/** אפשרויות חדרים בפרסום — אותן תוויות כמו בסינון בפיד */
export const LISTING_PUBLISH_ROOM_OPTIONS: FeedRoomFilterOption[] = FEED_ROOM_FILTER_OPTIONS.filter((o) => o.id !== "");

/** ערך מספרי לשמירה במודעה */
export function publishRoomsFromOptionId(roomId: string): number | null {
  if (!roomId) {
    return null;
  }
  if (roomId === "5+") {
    return 5;
  }
  const n = Number(roomId);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** מזהה אפשרות לטופס עריכה */
export function publishRoomOptionIdFromRooms(rooms: number): string {
  const standard = LISTING_PUBLISH_ROOM_OPTIONS.find((o) => publishRoomsFromOptionId(o.id) === rooms);
  if (standard) {
    return standard.id;
  }
  if (rooms >= 5) {
    return String(rooms);
  }
  return "";
}

export function feedSearchFiltersIsActive(filters: FeedSearchFilters): boolean {
  return (
    filters.location != null ||
    filters.propertyTypeId !== "" ||
    filters.minPriceIls != null ||
    filters.maxPriceIls != null ||
    filters.minRooms != null ||
    filters.maxRooms != null ||
    filters.requiredFeatures.length > 0
  );
}

export function listingMatchesFeedSearchFilters(
  listing: RentalListing,
  filters: FeedSearchFilters,
): boolean {
  if (filters.location && !listingMatchesFeedLocationFilter(listing, filters.location)) {
    return false;
  }
  if (filters.propertyTypeId && listing.propertyTypeId !== filters.propertyTypeId) {
    return false;
  }
  if (filters.minPriceIls != null && listing.priceIls < filters.minPriceIls) {
    return false;
  }
  if (filters.maxPriceIls != null && listing.priceIls > filters.maxPriceIls) {
    return false;
  }
  if (filters.minRooms != null && listing.rooms < filters.minRooms) {
    return false;
  }
  if (filters.maxRooms != null && listing.rooms > filters.maxRooms) {
    return false;
  }
  for (const feature of filters.requiredFeatures) {
    if (!listing.features.includes(feature)) {
      return false;
    }
  }
  return true;
}

/** סינון סופי לפיד — כולל דמו ומודעות ללא placeId */
export function applyFeedSearchFilters(
  listings: RentalListing[],
  filters: FeedSearchFilters,
): RentalListing[] {
  if (!feedSearchFiltersIsActive(filters)) {
    return listings;
  }
  return listings.filter((listing) => listingMatchesFeedSearchFilters(listing, filters));
}

export type FeedSortId = "newest" | "price_asc" | "price_desc";

export const DEFAULT_FEED_SORT_ID: FeedSortId = "newest";

export const FEED_SORT_OPTIONS: { id: FeedSortId; label: string }[] = [
  { id: "newest", label: "תאריך" },
  { id: "price_asc", label: "מחיר - מהזול ליקר" },
  { id: "price_desc", label: "מחיר - מהיקר לזול" },
];

export function feedSortLabel(sortId: FeedSortId): string {
  return FEED_SORT_OPTIONS.find((o) => o.id === sortId)?.label ?? FEED_SORT_OPTIONS[0]!.label;
}

/** תווית לכפתור המיון הפתוח (למשל «מיון לפי תאריך») */
export function feedSortTriggerLabel(sortId: FeedSortId): string {
  if (sortId === "newest") {
    return "מיון לפי תאריך";
  }
  return "מיון לפי מחיר";
}

export function sortFeedListings<T extends Pick<RentalListing, "priceIls" | "publishedAt">>(
  listings: T[],
  sortId: FeedSortId,
): T[] {
  const sorted = [...listings];
  if (sortId === "price_asc" || sortId === "price_desc") {
    const direction = sortId === "price_asc" ? 1 : -1;
    sorted.sort((a, b) => {
      const byPrice = (a.priceIls - b.priceIls) * direction;
      if (byPrice !== 0) {
        return byPrice;
      }
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    });
    return sorted;
  }
  sorted.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  return sorted;
}
