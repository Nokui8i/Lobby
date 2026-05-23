"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  DEFAULT_FEED_SORT_ID,
  EMPTY_FEED_SEARCH_FILTERS,
  feedFiltersFromUrlSearchParams,
  feedFiltersUrlQueryString,
  feedLocationFilterSummary,
  feedSearchFiltersIsActive,
  type FeedSearchFilters,
  type FeedSortId,
  mergeFeedWithHomeDemoListings,
  isHomeFeedDemoEnabled,
  HOME_FEED_DEMO_INITIAL_VISIBLE,
  HOME_FEED_DEMO_LOAD_STEP,
  createFeedShuffleSeed,
  orderFeedForDisplay,
  type RentalListing,
} from "@lobby/shared";
import { FeedSortMenu } from "@/components/FeedSortMenu";
import { ListingHomeFeed } from "@/components/listings/ListingHomeFeed";
import { type FeedListingItem } from "@/components/listings/listingFeedLayout";
import { ListingFeedSkeleton } from "@/components/listings/ListingCardSkeleton";
import { fetchActiveListingsFromFirestore } from "@/lib/firebase/listingQueries";
import { isFirebaseConfigured } from "@/lib/firebase/isConfigured";
import { HomeFeedHero } from "./HomeFeedBanner";

const INITIAL_VISIBLE_LISTINGS = isHomeFeedDemoEnabled() ? HOME_FEED_DEMO_INITIAL_VISIBLE : 6;
const LISTINGS_LOAD_STEP = isHomeFeedDemoEnabled() ? HOME_FEED_DEMO_LOAD_STEP : 6;
const FEED_FETCH_LIMIT = 48;
function createFirestoreFeed(listings: RentalListing[]): FeedListingItem[] {
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

function feedStateQueryKey(filters: FeedSearchFilters, sortId: FeedSortId): string {
  return feedFiltersUrlQueryString(filters, sortId);
}

export function ListingsFeed() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlFeedState = feedFiltersFromUrlSearchParams(new URLSearchParams(searchParams.toString()));
  const [appliedFilters, setAppliedFilters] = useState<FeedSearchFilters>(urlFeedState.filters);
  const [appliedSort, setAppliedSort] = useState<FeedSortId>(urlFeedState.sortId);
  const urlQueryKeyRef = useRef(feedStateQueryKey(urlFeedState.filters, urlFeedState.sortId));
  const [feedListings, setFeedListings] = useState<FeedListingItem[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [feedError, setFeedError] = useState(false);
  const [visibleListingCount, setVisibleListingCount] = useState(INITIAL_VISIBLE_LISTINGS);
  const [feedShuffleSeed, setFeedShuffleSeed] = useState(() => createFeedShuffleSeed());
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const feedListingsRef = useRef<FeedListingItem[]>([]);

  const syncFeedToUrl = useCallback(
    (filters: FeedSearchFilters, sortId: FeedSortId) => {
      const nextKey = feedStateQueryKey(filters, sortId);
      if (nextKey === urlQueryKeyRef.current) {
        return;
      }
      urlQueryKeyRef.current = nextKey;
      const href = nextKey ? `/?${nextKey}` : "/";
      router.replace(href, { scroll: false });
    },
    [router],
  );

  useEffect(() => {
    const parsed = feedFiltersFromUrlSearchParams(new URLSearchParams(searchParams.toString()));
    const nextKey = feedStateQueryKey(parsed.filters, parsed.sortId);
    if (nextKey === urlQueryKeyRef.current) {
      return;
    }
    urlQueryKeyRef.current = nextKey;
    setAppliedFilters(parsed.filters);
    setAppliedSort(parsed.sortId);
  }, [searchParams]);

  const applyFeedSearch = useCallback(
    (filters: FeedSearchFilters) => {
      setAppliedFilters(filters);
      setFeedShuffleSeed(createFeedShuffleSeed());
      syncFeedToUrl(filters, appliedSort);
    },
    [appliedSort, syncFeedToUrl],
  );

  const applyFeedSort = useCallback(
    (sortId: FeedSortId) => {
      setAppliedSort(sortId);
      if (sortId === DEFAULT_FEED_SORT_ID) {
        setFeedShuffleSeed(createFeedShuffleSeed());
      }
      syncFeedToUrl(appliedFilters, sortId);
    },
    [appliedFilters, syncFeedToUrl],
  );

  useEffect(() => {
    setFeedShuffleSeed(createFeedShuffleSeed());
  }, [appliedFilters, appliedSort]);

  const loadListings = useCallback(async () => {
    const isBackground = feedListingsRef.current.length > 0;
    setFeedError(false);
    if (!isBackground) setFeedLoading(true);

    if (!isFirebaseConfigured()) {
      const demoOnly = mergeFeedWithHomeDemoListings([], appliedFilters, appliedSort);
      feedListingsRef.current = createFirestoreFeed(demoOnly);
      setFeedListings(feedListingsRef.current);
      setVisibleListingCount(
        Math.min(isHomeFeedDemoEnabled() ? HOME_FEED_DEMO_INITIAL_VISIBLE : INITIAL_VISIBLE_LISTINGS, demoOnly.length),
      );
      setFeedLoading(false);
      return;
    }

    try {
      const remote = await fetchActiveListingsFromFirestore({
        maxListings: FEED_FETCH_LIMIT,
        feedFilters: appliedFilters,
        feedSort: appliedSort,
      });
      const feed = createFirestoreFeed(mergeFeedWithHomeDemoListings(remote, appliedFilters, appliedSort));
      feedListingsRef.current = feed;
      setFeedListings(feed);
      setVisibleListingCount(Math.min(INITIAL_VISIBLE_LISTINGS, feed.length));
    } catch (err) {
      if (process.env.NODE_ENV === "development") {
        console.error("[Lobby] טעינת פיד נכשלה:", err);
      }
      if (isHomeFeedDemoEnabled()) {
        const demoOnly = mergeFeedWithHomeDemoListings([], appliedFilters, appliedSort);
        feedListingsRef.current = createFirestoreFeed(demoOnly);
        setFeedListings(feedListingsRef.current);
        setVisibleListingCount(
          Math.min(
            isHomeFeedDemoEnabled() ? HOME_FEED_DEMO_INITIAL_VISIBLE : INITIAL_VISIBLE_LISTINGS,
            demoOnly.length,
          ),
        );
        setFeedError(false);
      } else {
        setFeedListings([]);
        setFeedError(true);
      }
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

  const orderedFeed = useMemo(
    () =>
      orderFeedForDisplay(
        feedListings,
        appliedSort,
        appliedSort === DEFAULT_FEED_SORT_ID ? feedShuffleSeed : null,
      ),
    [feedListings, appliedSort, feedShuffleSeed],
  );

  const visibleListings = orderedFeed.slice(0, visibleListingCount);
  const locationSummary = appliedFilters.location ? feedLocationFilterSummary(appliedFilters.location) : "";

  return (
    <div>
      <HomeFeedHero
        appliedFilters={appliedFilters}
        onSearch={applyFeedSearch}
        loading={feedLoading}
        sortRow={<FeedSortMenu value={appliedSort} onChange={applyFeedSort} disabled={feedLoading} />}
      />

      <section className="relative z-0 mx-auto mt-5 max-w-[1280px] px-4 sm:px-6">
        <div className="mb-5 flex flex-wrap items-center justify-start gap-2">
          <h2 className="font-display m-0 text-2xl font-bold text-graphite">דירות להשכרה</h2>
          {appliedFilters.location ? (
            <span className="rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold text-brand">
              {locationSummary}
            </span>
          ) : null}
        </div>

        {feedLoading && feedListings.length === 0 ? (
          <ListingFeedSkeleton count={isHomeFeedDemoEnabled() ? 12 : 6} />
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
          <ListingHomeFeed listings={visibleListings} />
        ) : null}

        <div ref={loadMoreRef} className="h-px shrink-0" aria-hidden />
      </section>
    </div>
  );
}
