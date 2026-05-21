"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  DEFAULT_FEED_SORT_ID,
  EMPTY_FEED_SEARCH_FILTERS,
  feedLocationFilterSummary,
  feedSearchFiltersIsActive,
  type FeedSearchFilters,
  type FeedSortId,
  type RentalListing,
} from "@lobby/shared";
import { FeedSortMenu } from "@/components/FeedSortMenu";
import { ListingCard } from "@/components/listings/ListingCard";
import { ListingFeedSkeleton } from "@/components/listings/ListingCardSkeleton";
import { LISTING_FEED_GRID_CLASS } from "@/components/listings/listingCardStyles";
import { fetchActiveListingsFromFirestore } from "@/lib/firebase/listingQueries";
import { isFirebaseConfigured } from "@/lib/firebase/isConfigured";
import { HomeFeedHero } from "./HomeFeedBanner";

const INITIAL_VISIBLE_LISTINGS = 6;
const LISTINGS_LOAD_STEP = 6;
const FEED_FETCH_LIMIT = 48;

type FeedListing = RentalListing & {
  feedKey: string;
  listingId: string;
};

function createFirestoreFeed(listings: RentalListing[]): FeedListing[] {
  return listings.map((listing) => ({
    ...listing,
    feedKey: `${listing.id}-feed-firestore`,
    listingId: listing.id,
  }));
}

function FeedEmptyState({ children }: { children: ReactNode }) {
  return (
    <p className="bubble-card py-10 text-center text-sm font-medium text-graphite/60" role="status">
      {children}
    </p>
  );
}

export function ListingsFeed() {
  const [appliedFilters, setAppliedFilters] = useState<FeedSearchFilters>(EMPTY_FEED_SEARCH_FILTERS);
  const [appliedSort, setAppliedSort] = useState<FeedSortId>(DEFAULT_FEED_SORT_ID);
  const [feedListings, setFeedListings] = useState<FeedListing[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [feedError, setFeedError] = useState(false);
  const [visibleListingCount, setVisibleListingCount] = useState(INITIAL_VISIBLE_LISTINGS);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const feedListingsRef = useRef<FeedListing[]>([]);

  const loadListings = useCallback(async () => {
    const isBackground = feedListingsRef.current.length > 0;
    setFeedError(false);
    if (!isBackground) setFeedLoading(true);

    if (!isFirebaseConfigured()) {
      setFeedListings([]);
      setFeedLoading(false);
      return;
    }

    try {
      const remote = await fetchActiveListingsFromFirestore({
        maxListings: FEED_FETCH_LIMIT,
        feedFilters: appliedFilters,
        feedSort: appliedSort,
      });
      const feed = createFirestoreFeed(remote);
      feedListingsRef.current = feed;
      setFeedListings(feed);
      setVisibleListingCount(Math.min(INITIAL_VISIBLE_LISTINGS, feed.length));
    } catch {
      setFeedListings([]);
      setFeedError(true);
    } finally {
      setFeedLoading(false);
    }
  }, [appliedFilters, appliedSort]);

  useEffect(() => {
    void loadListings();
  }, [loadListings]);

  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target || feedListings.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleListingCount((n) => Math.min(feedListings.length, n + LISTINGS_LOAD_STEP));
        }
      },
      { rootMargin: "500px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [feedListings.length]);

  const visibleListings = feedListings.slice(0, visibleListingCount);
  const locationSummary = appliedFilters.location ? feedLocationFilterSummary(appliedFilters.location) : "";

  return (
    <div>
      <HomeFeedHero
        appliedFilters={appliedFilters}
        onSearch={setAppliedFilters}
        loading={feedLoading}
        sortRow={<FeedSortMenu value={appliedSort} onChange={setAppliedSort} disabled={feedLoading} />}
      />

      <section className="mx-auto mt-5 max-w-[1280px] px-4 sm:px-6">
        <div className="mb-5 flex flex-wrap items-center justify-start gap-2">
          <h2 className="font-display m-0 text-2xl font-bold text-graphite">דירות להשכרה</h2>
          {appliedFilters.location ? (
            <span className="rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold text-brand">
              {locationSummary}
            </span>
          ) : null}
        </div>

        {feedLoading && feedListings.length === 0 ? (
          <ListingFeedSkeleton count={6} />
        ) : null}

        {!feedLoading && feedError ? (
          <FeedEmptyState>לא הצלחנו לטעון מודעות. נסו לרענן.</FeedEmptyState>
        ) : null}

        {!feedLoading && !feedError && isFirebaseConfigured() && feedListings.length === 0 ? (
          <FeedEmptyState>
            {feedSearchFiltersIsActive(appliedFilters)
              ? "אין מודעות לפי הסינון הנוכחי."
              : "אין כרגע מודעות פעילות בלוח."}
          </FeedEmptyState>
        ) : null}

        {visibleListings.length > 0 ? (
          <div className={LISTING_FEED_GRID_CLASS}>
            {visibleListings.map((listing) => (
              <ListingCard key={listing.feedKey} listing={listing} />
            ))}
          </div>
        ) : null}

        <div ref={loadMoreRef} className="h-px shrink-0" aria-hidden />
      </section>

      <section className="mx-auto mt-16 max-w-[1280px] px-4 pb-8 sm:px-6">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { t: "חיפוש חכם", d: "סינון לפי אזור, מחיר, חדרים ומאפיינים.", e: "🔎" },
            { t: "צ׳אט ישיר", d: "תקשורת מול המפרסם בלי תיווך.", e: "💬" },
            { t: "דיווח מהיר", d: "כל מודעה ניתנת לדיווח על עמלה או הונאה.", e: "🛡️" },
          ].map((f) => (
            <div key={f.t} className="bubble-card p-5" style={{ borderRadius: 16 }}>
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-brand/10 text-xl">{f.e}</div>
              <h3 className="mt-4 text-base font-bold text-graphite">{f.t}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-graphite/65">{f.d}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
