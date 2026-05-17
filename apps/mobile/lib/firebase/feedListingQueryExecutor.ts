import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  where,
  type QueryConstraint,
} from "firebase/firestore";
import {
  LISTINGS_COLLECTION,
  buildFeedListingFirestorePlan,
  feedLocationFilterQueryFields,
  listingFromFirestorePayload,
  listingMatchesFeedClientPostFilters,
  listingMatchesFeedLocationFilter,
  listingMatchesFeedSearchFilters,
  sortFeedListings,
  type FeedListingFirestorePlan,
  type FeedSearchFilters,
  type FeedSortId,
  type RentalListing,
} from "@lobby/shared";
import { getFirestoreDb } from "./client";

function isFirestoreIndexOrQueryError(err: unknown): boolean {
  const code = typeof err === "object" && err && "code" in err ? String((err as { code: string }).code) : "";
  return code === "failed-precondition" || code === "invalid-argument";
}

export function queryConstraintsFromFeedPlan(plan: FeedListingFirestorePlan): QueryConstraint[] {
  const constraints: QueryConstraint[] = [where("status", "==", "active")];

  for (const eq of plan.equalities) {
    constraints.push(where(eq.field, "==", eq.value));
  }

  if (plan.rangeField && plan.rangeMin != null) {
    constraints.push(where(plan.rangeField, ">=", plan.rangeMin));
  }
  if (plan.rangeField && plan.rangeMax != null) {
    constraints.push(where(plan.rangeField, "<=", plan.rangeMax));
  }

  if (plan.arrayContainsFeature) {
    constraints.push(where("features", "array-contains", plan.arrayContainsFeature));
  }

  constraints.push(orderBy(plan.orderByField, plan.orderByDirection));
  constraints.push(limit(plan.limit));

  return constraints;
}

function queryConstraintsFallback(filters: FeedSearchFilters | null, maxListings: number): QueryConstraint[] {
  const constraints: QueryConstraint[] = [where("status", "==", "active")];

  if (filters?.location?.cityPlaceId) {
    const loc = feedLocationFilterQueryFields(filters.location);
    constraints.push(where("cityPlaceId", "==", loc.cityPlaceId));
    if (loc.neighborhoodPlaceId) {
      constraints.push(where("neighborhoodPlaceId", "==", loc.neighborhoodPlaceId));
    }
    if (loc.streetPlaceId) {
      constraints.push(where("streetPlaceId", "==", loc.streetPlaceId));
    }
    if (loc.areaPlaceId) {
      constraints.push(where("areaPlaceId", "==", loc.areaPlaceId));
    }
  }

  if (filters?.propertyTypeId) {
    constraints.push(where("propertyTypeId", "==", filters.propertyTypeId));
  }

  constraints.push(limit(maxListings));
  return constraints;
}

async function runListingQuery(constraints: QueryConstraint[]): Promise<RentalListing[]> {
  const db = getFirestoreDb();
  const listingsQuery = query(collection(db, LISTINGS_COLLECTION), ...constraints);
  const snapshot = await getDocs(listingsQuery);
  const listings: RentalListing[] = [];

  for (const docSnap of snapshot.docs) {
    const mapped = listingFromFirestorePayload(docSnap.id, docSnap.data() as Record<string, unknown>);
    if (mapped && mapped.status === "active") {
      listings.push(mapped);
    }
  }

  return listings;
}

async function fetchActiveListingsFallback(
  filters: FeedSearchFilters | null,
  sortId: FeedSortId,
  maxListings: number,
): Promise<RentalListing[]> {
  const raw = await runListingQuery(queryConstraintsFallback(filters, maxListings));
  const location = filters?.location ?? null;

  const filtered = raw.filter((listing) => {
    if (location && !listingMatchesFeedLocationFilter(listing, location)) {
      return false;
    }
    if (filters && !listingMatchesFeedSearchFilters(listing, filters)) {
      return false;
    }
    return true;
  });

  return sortFeedListings(filtered, sortId);
}

export async function fetchActiveListingsWithPlan(
  filters: FeedSearchFilters | null,
  sortId: FeedSortId,
  maxListings: number,
): Promise<RentalListing[]> {
  const plan = buildFeedListingFirestorePlan(filters, sortId, maxListings);

  try {
    const raw = await runListingQuery(queryConstraintsFromFeedPlan(plan));
    const listings: RentalListing[] = [];

    for (const listing of raw) {
      if (!listingMatchesFeedClientPostFilters(listing, filters, plan)) {
        continue;
      }
      listings.push(listing);
    }

    if (plan.clientPostFilter.resortBySort) {
      return sortFeedListings(listings, sortId);
    }

    return listings;
  } catch (err) {
    if (!isFirestoreIndexOrQueryError(err)) {
      throw err;
    }
    return fetchActiveListingsFallback(filters, sortId, maxListings);
  }
}
