import { collection, doc, getDoc, getDocs, limit, orderBy, query, where } from "firebase/firestore";
import type { FeedSearchFilters, FeedSortId, RentalListing } from "@lobby/shared";
import {
  DEFAULT_FEED_SORT_ID,
  LISTINGS_COLLECTION,
  listingFromFirestorePayload,
} from "@lobby/shared";
import { getFirestoreDb } from "./client";
import { fetchActiveListingsWithPlan } from "./feedListingQueryExecutor";

export type FetchActiveListingsOptions = {
  maxListings?: number;
  locationFilter?: FeedSearchFilters["location"];
  feedFilters?: FeedSearchFilters | null;
  feedSort?: FeedSortId;
};

function normalizeFetchOptions(
  options: number | FetchActiveListingsOptions | undefined,
): FetchActiveListingsOptions {
  if (typeof options === "number") {
    return { maxListings: options };
  }
  return options ?? {};
}

function resolveFeedFilters(options: FetchActiveListingsOptions): FeedSearchFilters | null {
  if (options.feedFilters) {
    return options.feedFilters;
  }
  if (options.locationFilter) {
    return {
      location: options.locationFilter,
      propertyTypeId: "",
      minPriceIls: null,
      maxPriceIls: null,
      minRooms: null,
      maxRooms: null,
      requiredFeatures: [],
    };
  }
  return null;
}

export async function fetchActiveListingsFromFirestore(
  options?: number | FetchActiveListingsOptions,
): Promise<RentalListing[]> {
  const normalized = normalizeFetchOptions(options);
  const maxListings = normalized.maxListings ?? 96;
  const filters = resolveFeedFilters(normalized);
  const sortId = normalized.feedSort ?? DEFAULT_FEED_SORT_ID;

  return fetchActiveListingsWithPlan(filters, sortId, maxListings);
}

export async function fetchListingByIdFromFirestore(listingId: string): Promise<RentalListing | null> {
  const db = getFirestoreDb();
  const docRef = doc(db, LISTINGS_COLLECTION, listingId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    return null;
  }

  return listingFromFirestorePayload(docSnap.id, docSnap.data() as Record<string, unknown>);
}

export async function fetchMyListingsFromFirestore(publisherUid: string, maxListings = 80): Promise<RentalListing[]> {
  const db = getFirestoreDb();
  const listingsQuery = query(
    collection(db, LISTINGS_COLLECTION),
    where("publisherId", "==", publisherUid),
    orderBy("publishedAt", "desc"),
    limit(maxListings),
  );

  const snapshot = await getDocs(listingsQuery);
  const listings: RentalListing[] = [];

  for (const docSnap of snapshot.docs) {
    const mapped = listingFromFirestorePayload(docSnap.id, docSnap.data() as Record<string, unknown>);
    if (mapped && mapped.publisher.id === publisherUid) {
      listings.push(mapped);
    }
  }

  return listings;
}
