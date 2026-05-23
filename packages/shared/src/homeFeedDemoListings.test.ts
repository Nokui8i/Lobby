import { describe, expect, it } from "vitest";
import { EMPTY_FEED_SEARCH_FILTERS, sortFeedListings } from "./feedFilters";
import { getHomeFeedDemoListings, mergeFeedWithHomeDemoListings } from "./homeFeedDemoListings";
import type { ResolvedLocation } from "./location";
import type { RentalListing } from "./types";

const haifaFilter: ResolvedLocation = {
  placeId: "city-haifa",
  kind: "city",
  primaryLabel: "חיפה",
  secondaryLabel: "חיפה",
  cityPlaceId: "city-haifa",
  cityLabel: "חיפה",
};

describe("mergeFeedWithHomeDemoListings", () => {
  it("filters demo listings by city when filters are active", () => {
    const prev = process.env.NEXT_PUBLIC_LOBBY_HOME_DEMO_FEED;
    process.env.NEXT_PUBLIC_LOBBY_HOME_DEMO_FEED = "true";

    try {
      const merged = mergeFeedWithHomeDemoListings([], {
        ...EMPTY_FEED_SEARCH_FILTERS,
        location: haifaFilter,
      });
      expect(merged.length).toBeGreaterThan(0);
      expect(merged.every((l) => l.city === "חיפה")).toBe(true);
      expect(merged.some((l) => l.city === "תל אביב")).toBe(false);
    } finally {
      process.env.NEXT_PUBLIC_LOBBY_HOME_DEMO_FEED = prev;
    }
  });

  it("sorts merged demo feed by price ascending", () => {
    const prev = process.env.NEXT_PUBLIC_LOBBY_HOME_DEMO_FEED;
    process.env.NEXT_PUBLIC_LOBBY_HOME_DEMO_FEED = "true";

    try {
      const merged = mergeFeedWithHomeDemoListings([], EMPTY_FEED_SEARCH_FILTERS, "price_asc");
      const prices = merged.map((l) => l.priceIls);
      expect(prices).toEqual([...prices].sort((a, b) => a - b));
      expect(sortFeedListings(getHomeFeedDemoListings(), "price_asc").map((l) => l.priceIls)).toEqual(prices);
    } finally {
      process.env.NEXT_PUBLIC_LOBBY_HOME_DEMO_FEED = prev;
    }
  });

  it("includes multiple cities when no location filter", () => {
    const prev = process.env.NEXT_PUBLIC_LOBBY_HOME_DEMO_FEED;
    process.env.NEXT_PUBLIC_LOBBY_HOME_DEMO_FEED = "true";

    try {
      const merged = mergeFeedWithHomeDemoListings([] as RentalListing[]);
      const cities = new Set(merged.map((l) => l.city));
      expect(cities.size).toBeGreaterThan(1);
      expect(getHomeFeedDemoListings().length).toBe(24);
    } finally {
      process.env.NEXT_PUBLIC_LOBBY_HOME_DEMO_FEED = prev;
    }
  });
});
