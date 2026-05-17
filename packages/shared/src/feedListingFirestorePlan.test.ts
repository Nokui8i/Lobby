import { describe, expect, it } from "vitest";
import {
  buildFeedListingFirestorePlan,
  listingMatchesFeedClientPostFilters,
} from "./feedListingFirestorePlan";
import { EMPTY_FEED_SEARCH_FILTERS } from "./feedFilters";
import type { RentalListing } from "./types";

function sampleListing(overrides: Partial<RentalListing> = {}): RentalListing {
  return {
    id: "l1",
    title: "דירה",
    city: "תל אביב",
    neighborhood: "",
    streetHint: "",
    priceIls: 5000,
    rooms: 3,
    sizeSqm: 70,
    floor: 2,
    totalFloors: 5,
    entryDate: "מיידי",
    imageUrl: "",
    gallery: [],
    features: ["parking", "elevator"],
    description: "",
    status: "active",
    publishedAt: "2026-01-10T00:00:00.000Z",
    expiresAt: "2026-02-10T00:00:00.000Z",
    publisher: { id: "u1", displayName: "Test", responseTimeLabel: "" },
    ...overrides,
  };
}

describe("buildFeedListingFirestorePlan", () => {
  it("orders by publishedAt desc for newest default", () => {
    const plan = buildFeedListingFirestorePlan(null, "newest");
    expect(plan.orderByField).toBe("publishedAt");
    expect(plan.orderByDirection).toBe("desc");
    expect(plan.clientPostFilter.resortBySort).toBe(false);
  });

  it("orders by price asc for cheapest sort", () => {
    const plan = buildFeedListingFirestorePlan(null, "price_asc");
    expect(plan.orderByField).toBe("priceIls");
    expect(plan.orderByDirection).toBe("asc");
  });

  it("orders by price desc for expensive-first sort", () => {
    const plan = buildFeedListingFirestorePlan(null, "price_desc");
    expect(plan.orderByField).toBe("priceIls");
    expect(plan.orderByDirection).toBe("desc");
  });

  it("pushes price range to Firestore when filtering by price", () => {
    const plan = buildFeedListingFirestorePlan(
      {
        ...EMPTY_FEED_SEARCH_FILTERS,
        minPriceIls: 3000,
        maxPriceIls: 8000,
      },
      "price_asc",
    );
    expect(plan.rangeField).toBe("priceIls");
    expect(plan.rangeMin).toBe(3000);
    expect(plan.rangeMax).toBe(8000);
  });

  it("uses array-contains for a single feature filter", () => {
    const plan = buildFeedListingFirestorePlan(
      {
        ...EMPTY_FEED_SEARCH_FILTERS,
        requiredFeatures: ["parking"],
      },
      "newest",
    );
    expect(plan.arrayContainsFeature).toBe("parking");
    expect(plan.clientPostFilter.multiFeatures).toBe(false);
  });

  it("defers multiple features to client post-filter", () => {
    const plan = buildFeedListingFirestorePlan(
      {
        ...EMPTY_FEED_SEARCH_FILTERS,
        requiredFeatures: ["parking", "elevator"],
      },
      "newest",
    );
    expect(plan.arrayContainsFeature).toBeNull();
    expect(plan.clientPostFilter.multiFeatures).toBe(true);
  });
});

describe("listingMatchesFeedClientPostFilters", () => {
  it("filters rooms on client when price range uses Firestore", () => {
    const filters = {
      ...EMPTY_FEED_SEARCH_FILTERS,
      minPriceIls: 1000,
      minRooms: 4,
    };
    const plan = buildFeedListingFirestorePlan(filters, "newest");
    expect(plan.rangeField).toBe("priceIls");
    expect(plan.clientPostFilter.roomsRange).toBe(true);

    expect(
      listingMatchesFeedClientPostFilters(sampleListing({ rooms: 3, priceIls: 5000 }), filters, plan),
    ).toBe(false);
    expect(
      listingMatchesFeedClientPostFilters(sampleListing({ rooms: 4, priceIls: 5000 }), filters, plan),
    ).toBe(true);
  });
});
