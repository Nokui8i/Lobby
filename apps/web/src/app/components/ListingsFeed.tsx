"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  DEFAULT_FEED_SORT_ID,
  EMPTY_FEED_SEARCH_FILTERS,
  feedLocationFilterSummary,
  featureLabels,
  feedSearchFiltersIsActive,
  type FeedSearchFilters,
  type FeedSortId,
  type RentalListing,
} from "@lobby/shared";
import { FeedSearchBar } from "@/components/FeedSearchBar";
import { FeedSortMenu } from "@/components/FeedSortMenu";
import { SaveListingButton } from "@/components/SaveListingButton";
import { fetchActiveListingsFromFirestore } from "@/lib/firebase/listingQueries";
import { isFirebaseConfigured } from "@/lib/firebase/isConfigured";
import styles from "../page.module.css";

const INITIAL_VISIBLE_LISTINGS = 6;
const LISTINGS_LOAD_STEP = 6;

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

export function ListingsFeed() {
  const [appliedFilters, setAppliedFilters] = useState<FeedSearchFilters>(EMPTY_FEED_SEARCH_FILTERS);
  const [appliedSort, setAppliedSort] = useState<FeedSortId>(DEFAULT_FEED_SORT_ID);
  const [feedListings, setFeedListings] = useState<FeedListing[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [feedError, setFeedError] = useState(false);
  const [visibleListingCount, setVisibleListingCount] = useState(INITIAL_VISIBLE_LISTINGS);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const loadListings = useCallback(async () => {
    setFeedLoading(true);
    setFeedError(false);

    if (!isFirebaseConfigured()) {
      setFeedListings([]);
      setVisibleListingCount(INITIAL_VISIBLE_LISTINGS);
      setFeedLoading(false);
      return;
    }

    try {
      const remote = await fetchActiveListingsFromFirestore({
        maxListings: 96,
        feedFilters: appliedFilters,
        feedSort: appliedSort,
      });
      const feed = createFirestoreFeed(remote);
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
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void loadListings();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [loadListings]);

  useEffect(() => {
    const target = loadMoreRef.current;

    if (!target || feedListings.length === 0) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleListingCount((currentCount) =>
            Math.min(feedListings.length, currentCount + LISTINGS_LOAD_STEP),
          );
        }
      },
      { rootMargin: "500px" },
    );

    observer.observe(target);

    return () => observer.disconnect();
  }, [feedListings.length]);

  const visibleListings = feedListings.slice(0, visibleListingCount);
  const locationSummary = appliedFilters.location
    ? feedLocationFilterSummary(appliedFilters.location)
    : "";

  return (
    <div className={styles.listingsColumn}>
      <FeedSearchBar appliedFilters={appliedFilters} onSearch={setAppliedFilters} loading={feedLoading} />

      <div className={styles.sectionHeader}>
        <h2>דירות להשכרה</h2>
        <div className={styles.sectionHeaderMeta}>
          {appliedFilters.location ? (
            <span className={styles.feedFilterBadge}>{locationSummary}</span>
          ) : null}
          <FeedSortMenu value={appliedSort} onChange={setAppliedSort} disabled={feedLoading} />
        </div>
      </div>

      {feedLoading && feedListings.length === 0 ? (
        <p className={styles.feedLoading} role="status">
          טוענים מודעות…
        </p>
      ) : null}

      {!feedLoading && feedError ? (
        <p className={styles.feedEmpty} role="status">
          לא הצלחנו לטעון מודעות. בדקו חיבור ונסו לרענן את העמוד.
        </p>
      ) : null}

      {!feedLoading && !feedError && !isFirebaseConfigured() ? (
        <p className={styles.feedEmpty} role="status">
          אין חיבור ל־Firebase. הגדירו את משתני הסביבה כדי להציג מודעות אמיתיות מהלוח.
        </p>
      ) : null}

      {!feedLoading && !feedError && isFirebaseConfigured() && feedListings.length === 0 ? (
        <p className={styles.feedEmpty} role="status">
          {feedSearchFiltersIsActive(appliedFilters)
            ? locationSummary
              ? `אין כרגע מודעות פעילות ב${locationSummary} לפי הסינון. נסו אזור רחב יותר או פחות מסננים.`
              : "אין מודעות שעונות על הסינון. נסו לשנות מחיר, חדרים, מאפיינים או מיקום."
            : "אין כרגע מודעות פעילות בלוח. כשמפרסמים יעלו מודעות — הן יופיעו כאן."}
        </p>
      ) : null}

      <div className={styles.listingGrid}>
        {visibleListings.map((listing) => (
          <Link
            key={listing.feedKey}
            href={`/listings/${listing.listingId}`}
            className={styles.card}
          >
            <div className={styles.cardImage}>
              <Image src={listing.imageUrl} alt={listing.title} width={560} height={360} />
              <SaveListingButton
                listingId={listing.listingId}
                listingTitle={listing.title}
                imageUrl={listing.imageUrl}
                priceIls={listing.priceIls}
                variant="card"
                className={styles.cardSaveBtn}
              />
            </div>
            <div className={styles.cardBody}>
              <div className={styles.cardTop}>
                <h3>{listing.title}</h3>
                <strong>₪{listing.priceIls.toLocaleString("he-IL")}</strong>
              </div>
              <p>
                {[listing.streetLine?.trim(), listing.neighborhood?.trim(), listing.city]
                  .filter(Boolean)
                  .join(", ")}{" "}
                · {listing.rooms} חד׳ · {listing.sizeSqm} מ״ר
              </p>
              <div className={styles.featureRow}>
                {listing.features.slice(0, 3).map((feature) => (
                  <span key={feature}>{featureLabels[feature]}</span>
                ))}
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className={styles.loadMoreSentinel} ref={loadMoreRef} aria-hidden="true" />

      <div className={styles.trustStrip}>
        <strong>ראית דרישת עמלה?</strong>
        <span>כל מודעה כוללת דיווח מהיר, והצוות יכול להסתיר מפרים.</span>
      </div>
    </div>
  );
}
