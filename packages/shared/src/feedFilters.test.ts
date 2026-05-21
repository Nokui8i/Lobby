import { describe, expect, it } from "vitest";
import {
  EMPTY_FEED_SEARCH_FILTERS,
  listingMatchesFeedSearchFilters,
  publishRoomOptionIdFromRooms,
  publishRoomsFromOptionId,
  sortFeedListings,
} from "./feedFilters";
import type { RentalListing } from "./types";

const baseListing: RentalListing = {
  id: "a",
  title: "A",
  city: "חיפה",
  neighborhood: "",
  streetHint: "",
  priceIls: 4000,
  rooms: 2,
  sizeSqm: 50,
  floor: 1,
  totalFloors: 4,
  entryDate: "מיידי",
  imageUrl: "",
  gallery: [],
  features: ["balcony"],
  description: "",
  status: "active",
  publishedAt: "2026-01-01T00:00:00.000Z",
  expiresAt: "2026-02-01T00:00:00.000Z",
  publisher: { id: "u", displayName: "U", responseTimeLabel: "" },
};

describe("listingMatchesFeedSearchFilters", () => {
  it("matches price and feature constraints", () => {
    const filters = {
      ...EMPTY_FEED_SEARCH_FILTERS,
      minPriceIls: 3500,
      requiredFeatures: ["balcony" as const],
    };
    expect(listingMatchesFeedSearchFilters(baseListing, filters)).toBe(true);
    expect(listingMatchesFeedSearchFilters({ ...baseListing, priceIls: 2000 }, filters)).toBe(false);
  });
});

describe("sortFeedListings", () => {
  it("sorts by price ascending", () => {
    const sorted = sortFeedListings(
      [
        { ...baseListing, id: "b", priceIls: 6000, publishedAt: "2026-02-01T00:00:00.000Z" },
        { ...baseListing, id: "a", priceIls: 3000, publishedAt: "2026-01-01T00:00:00.000Z" },
      ],
      "price_asc",
    );
    expect(sorted.map((l) => l.id)).toEqual(["a", "b"]);
  });

  it("sorts by price descending", () => {
    const sorted = sortFeedListings(
      [
        { ...baseListing, id: "a", priceIls: 3000 },
        { ...baseListing, id: "b", priceIls: 6000 },
      ],
      "price_desc",
    );
    expect(sorted.map((l) => l.id)).toEqual(["b", "a"]);
  });
});

describe("publish room options", () => {
  it("round-trips standard filter values", () => {
    expect(publishRoomsFromOptionId("2.5")).toBe(2.5);
    expect(publishRoomOptionIdFromRooms(2.5)).toBe("2.5");
    expect(publishRoomsFromOptionId("5+")).toBe(5);
    expect(publishRoomOptionIdFromRooms(5)).toBe("5+");
  });
});
