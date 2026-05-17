import { feedLocationFilterQueryFields } from "./feedLocationFilter";
import type { FeedSearchFilters, FeedSortId } from "./feedFilters";
import type { RentalListing } from "./types";

export type FeedListingOrderField = "publishedAt" | "priceIls" | "rooms";

export type FeedListingFirestorePlan = {
  equalities: Array<{ field: string; value: string | number }>;
  rangeField: "priceIls" | "rooms" | null;
  rangeMin: number | null;
  rangeMax: number | null;
  arrayContainsFeature: string | null;
  orderByField: FeedListingOrderField;
  orderByDirection: "asc" | "desc";
  limit: number;
  clientPostFilter: {
    priceRange: boolean;
    roomsRange: boolean;
    multiFeatures: boolean;
    resortBySort: boolean;
  };
};

const DEFAULT_FEED_FETCH_LIMIT = 96;

export function buildFeedListingFirestorePlan(
  filters: FeedSearchFilters | null,
  sortId: FeedSortId,
  maxListings = DEFAULT_FEED_FETCH_LIMIT,
): FeedListingFirestorePlan {
  const equalities: FeedListingFirestorePlan["equalities"] = [];
  let rangeField: FeedListingFirestorePlan["rangeField"] = null;
  let rangeMin: number | null = null;
  let rangeMax: number | null = null;

  const hasPriceFilter = filters?.minPriceIls != null || filters?.maxPriceIls != null;
  const hasRoomsFilter = filters?.minRooms != null || filters?.maxRooms != null;

  if (filters?.propertyTypeId) {
    equalities.push({ field: "propertyTypeId", value: filters.propertyTypeId });
  }

  if (filters?.location?.cityPlaceId) {
    const loc = feedLocationFilterQueryFields(filters.location);
    equalities.push({ field: "cityPlaceId", value: loc.cityPlaceId });
    if (loc.neighborhoodPlaceId) {
      equalities.push({ field: "neighborhoodPlaceId", value: loc.neighborhoodPlaceId });
    }
    if (loc.streetPlaceId) {
      equalities.push({ field: "streetPlaceId", value: loc.streetPlaceId });
    }
    if (loc.areaPlaceId) {
      equalities.push({ field: "areaPlaceId", value: loc.areaPlaceId });
    }
  }

  if (hasPriceFilter) {
    rangeField = "priceIls";
    rangeMin = filters?.minPriceIls ?? null;
    rangeMax = filters?.maxPriceIls ?? null;
  } else if (hasRoomsFilter) {
    rangeField = "rooms";
    rangeMin = filters?.minRooms ?? null;
    rangeMax = filters?.maxRooms ?? null;
  }

  const requiredFeatures = filters?.requiredFeatures ?? [];
  const arrayContainsFeature = requiredFeatures.length === 1 ? requiredFeatures[0]! : null;

  let orderByField: FeedListingOrderField = "publishedAt";
  let orderByDirection: "asc" | "desc" = "desc";

  if (sortId === "price_asc") {
    orderByField = "priceIls";
    orderByDirection = "asc";
  } else if (sortId === "price_desc") {
    orderByField = "priceIls";
    orderByDirection = "desc";
  }

  if (rangeField === "priceIls") {
    orderByField = "priceIls";
    if (sortId === "price_asc") {
      orderByDirection = "asc";
    } else if (sortId === "price_desc") {
      orderByDirection = "desc";
    } else {
      orderByDirection = "desc";
    }
  } else if (rangeField === "rooms") {
    orderByField = "rooms";
    orderByDirection = "asc";
  }

  const resortBySort = rangeField === "priceIls" && sortId === "newest";

  return {
    equalities,
    rangeField,
    rangeMin,
    rangeMax,
    arrayContainsFeature,
    orderByField,
    orderByDirection,
    limit: maxListings,
    clientPostFilter: {
      priceRange: hasPriceFilter && rangeField !== "priceIls",
      roomsRange: hasRoomsFilter && rangeField !== "rooms",
      multiFeatures: requiredFeatures.length > 1,
      resortBySort,
    },
  };
}

export function listingMatchesFeedClientPostFilters(
  listing: RentalListing,
  filters: FeedSearchFilters | null,
  plan: FeedListingFirestorePlan,
): boolean {
  if (!filters) {
    return true;
  }

  if (plan.clientPostFilter.priceRange) {
    if (filters.minPriceIls != null && listing.priceIls < filters.minPriceIls) {
      return false;
    }
    if (filters.maxPriceIls != null && listing.priceIls > filters.maxPriceIls) {
      return false;
    }
  }

  if (plan.clientPostFilter.roomsRange) {
    if (filters.minRooms != null && listing.rooms < filters.minRooms) {
      return false;
    }
    if (filters.maxRooms != null && listing.rooms > filters.maxRooms) {
      return false;
    }
  }

  if (plan.clientPostFilter.multiFeatures) {
    for (const feature of filters.requiredFeatures) {
      if (!listing.features.includes(feature)) {
        return false;
      }
    }
  }

  return true;
}
