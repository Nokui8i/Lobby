import { describe, expect, it } from "vitest";
import { EMPTY_FEED_SEARCH_FILTERS } from "./feedFilters";
import {
  feedFiltersFromUrlSearchParams,
  feedFiltersToUrlSearchParams,
  feedFiltersUrlQueryString,
} from "./feedFiltersUrl";
import type { ResolvedLocation } from "./location";

const haifa: ResolvedLocation = {
  placeId: "city-haifa",
  kind: "city",
  primaryLabel: "חיפה",
  secondaryLabel: "חיפה",
  cityPlaceId: "city-haifa",
  cityLabel: "חיפה",
};

describe("feedFiltersUrl", () => {
  it("round-trips filters and sort in URL params", () => {
    const filters = {
      ...EMPTY_FEED_SEARCH_FILTERS,
      location: haifa,
      propertyTypeId: "apartment",
      minPriceIls: 3000,
      maxPriceIls: 8000,
      minRooms: 2,
      maxRooms: 4,
      requiredFeatures: ["parking", "elevator"],
    };
    const params = feedFiltersToUrlSearchParams(filters, "price_asc");
    const parsed = feedFiltersFromUrlSearchParams(params);
    expect(parsed.sortId).toBe("price_asc");
    expect(parsed.filters.location).toEqual(haifa);
    expect(parsed.filters.propertyTypeId).toBe("apartment");
    expect(parsed.filters.minPriceIls).toBe(3000);
    expect(parsed.filters.maxPriceIls).toBe(8000);
    expect(parsed.filters.minRooms).toBe(2);
    expect(parsed.filters.maxRooms).toBe(4);
    expect(parsed.filters.requiredFeatures).toEqual(["parking", "elevator"]);
  });

  it("omits default sort from query string", () => {
    expect(feedFiltersUrlQueryString(EMPTY_FEED_SEARCH_FILTERS, "newest")).toBe("");
  });
});
