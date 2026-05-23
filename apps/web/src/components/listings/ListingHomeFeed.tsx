"use client";

import { useMemo } from "react";
import { ListingCard } from "@/components/listings/ListingCard";
import { buildListingFeedSegments, type FeedListingItem } from "@/components/listings/listingFeedLayout";
import { LISTING_FEED_GRID_CLASS } from "@/components/listings/listingCardStyles";
import { useListingFeedColumnCount } from "@/components/listings/useListingFeedColumnCount";
import { HomeFeatureBanners } from "@/components/home/HomeFeatureBanners";

export function ListingHomeFeed({ listings }: { listings: FeedListingItem[] }) {
  const columnCount = useListingFeedColumnCount();
  const segments = useMemo(
    () => buildListingFeedSegments(listings, columnCount, { featureBanners: true }),
    [listings, columnCount],
  );

  return (
    <div className={LISTING_FEED_GRID_CLASS}>
      {segments.map((segment, segmentIndex) => {
        if (segment.kind === "feature-banners") {
          return (
            <div key={`banners-${segmentIndex}`} className="feature-banners-fade-band col-span-full">
              <div className="feature-banners-color-smear" aria-hidden />
              <HomeFeatureBanners embedded />
            </div>
          );
        }

        if (segment.kind === "spotlight") {
          return (
            <div
              key={`spotlight-${segmentIndex}`}
              className="col-span-full grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3 md:gap-4"
            >
              {segment.listings.map((listing) => (
                <ListingCard key={listing.feedKey} listing={listing} size="featured" />
              ))}
            </div>
          );
        }

        return segment.listings.map((listing) => (
          <ListingCard key={listing.feedKey} listing={listing} size="default" />
        ));
      })}
    </div>
  );
}
