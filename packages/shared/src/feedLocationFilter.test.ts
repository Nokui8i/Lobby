import { describe, expect, it } from "vitest";
import { listingMatchesFeedLocationFilter } from "./feedLocationFilter";
import type { ResolvedLocation } from "./location";
import type { RentalListing } from "./types";

const haifaFilter: ResolvedLocation = {
  placeId: "city-haifa",
  kind: "city",
  primaryLabel: "חיפה",
  secondaryLabel: "חיפה, מחוז חיפה",
  cityPlaceId: "city-haifa",
  cityLabel: "חיפה",
};

const baseListing: RentalListing = {
  id: "x",
  title: "דירה",
  city: "חיפה",
  neighborhood: "מרכז",
  streetHint: "הנשיא",
  priceIls: 4000,
  rooms: 3,
  sizeSqm: 70,
  floor: 2,
  totalFloors: 5,
  entryDate: "מיידי",
  imageUrl: "",
  gallery: [],
  features: [],
  description: "",
  status: "active",
  publishedAt: "2026-01-01T00:00:00.000Z",
  expiresAt: "2026-02-01T00:00:00.000Z",
  publisher: { id: "u", displayName: "U", responseTimeLabel: "" },
};

describe("listingMatchesFeedLocationFilter", () => {
  it("matches by cityPlaceId", () => {
    expect(
      listingMatchesFeedLocationFilter({ ...baseListing, cityPlaceId: "city-haifa" }, haifaFilter),
    ).toBe(true);
    expect(
      listingMatchesFeedLocationFilter({ ...baseListing, cityPlaceId: "city-tlv", city: "תל אביב" }, haifaFilter),
    ).toBe(false);
  });

  it("falls back to city label when listing has no cityPlaceId", () => {
    expect(listingMatchesFeedLocationFilter(baseListing, haifaFilter)).toBe(true);
    expect(listingMatchesFeedLocationFilter({ ...baseListing, city: "תל אביב" }, haifaFilter)).toBe(false);
  });
});
