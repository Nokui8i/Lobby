import { DEFAULT_FEED_SORT_ID, sortFeedListings, type FeedSortId } from "./feedFilters";
import type { RentalListing } from "./types";

/** ערבוב דטרמיניסטי לפי seed — אותו seed = אותו סדר; seed חדש = סדר חדש */
export function shuffleFeedListingsWithSeed<T>(listings: T[], seed: number): T[] {
  if (listings.length <= 1) {
    return [...listings];
  }

  const result = [...listings];
  let state = seed >>> 0;

  const next = () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    const tmp = result[i]!;
    result[i] = result[j]!;
    result[j] = tmp;
  }

  return result;
}

/**
 * סדר תצוגה בפיד: מיון מחיר/תאריך; במצב «תאריך» (ברירת מחדל) — ערבוב כולל זוג הספוטלייט.
 * במיון מחיר — סדר קבוע ללא ערבוב.
 */
export function orderFeedForDisplay<T extends Pick<RentalListing, "priceIls" | "publishedAt">>(
  listings: T[],
  sortId: FeedSortId,
  shuffleSeed: number | null,
): T[] {
  const sorted = sortFeedListings(listings, sortId);
  if (sortId !== DEFAULT_FEED_SORT_ID || shuffleSeed == null) {
    return sorted;
  }
  return shuffleFeedListingsWithSeed(sorted, shuffleSeed);
}

export function createFeedShuffleSeed(): number {
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    return buf[0]! >>> 0;
  }
  return (Date.now() ^ (Math.random() * 0xffffffff)) >>> 0;
}
