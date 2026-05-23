import type { RentalListing } from "@lobby/shared";

export type FeedListingItem = RentalListing & {
  feedKey: string;
  listingId: string;
};

export type ListingFeedSegment =
  | { kind: "grid"; listings: FeedListingItem[] }
  | { kind: "spotlight"; listings: FeedListingItem[] }
  | { kind: "feature-banners" };

/** שורות רגילות לפני זוג «ספוטלייט» (2 כרטיסים גדולים) */
export const FEED_COMPACT_ROWS_BEFORE_SPOTLIGHT = 3;
export const FEED_SPOTLIGHT_PAIR_SIZE = 2;

export function feedCompactRowsBeforeSpotlight(): number {
  return FEED_COMPACT_ROWS_BEFORE_SPOTLIGHT;
}

/**
 * מחלק את הפיד לבלוקים: גריד צפוף → (פעם אחת) באנר יתרונות → זוג גדול → חוזר.
 * תואם ל־2 / 3 / 4 עמודות ב־LISTING_FEED_GRID_CLASS.
 */
export function buildListingFeedSegments(
  listings: FeedListingItem[],
  columnCount: number,
  options?: { featureBanners?: boolean },
): ListingFeedSegment[] {
  const compactRows = feedCompactRowsBeforeSpotlight();
  const compactBatchSize = Math.max(1, columnCount * compactRows);
  const segments: ListingFeedSegment[] = [];
  let index = 0;
  let featureBannersInserted = false;
  const showBanners = options?.featureBanners !== false;

  while (index < listings.length) {
    const compact: FeedListingItem[] = [];
    for (let n = 0; n < compactBatchSize && index < listings.length; n++) {
      compact.push(listings[index++]);
    }
    if (compact.length > 0) {
      segments.push({ kind: "grid", listings: compact });
    }

    if (showBanners && !featureBannersInserted) {
      segments.push({ kind: "feature-banners" });
      featureBannersInserted = true;
    }

    const spotlight: FeedListingItem[] = [];
    for (let n = 0; n < FEED_SPOTLIGHT_PAIR_SIZE && index < listings.length; n++) {
      spotlight.push(listings[index++]);
    }
    if (spotlight.length > 0) {
      segments.push({ kind: "spotlight", listings: spotlight });
    }
  }

  return segments;
}
