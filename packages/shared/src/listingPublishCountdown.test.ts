import { describe, expect, it } from "vitest";
import {
  getListingPublishCountdown,
  listingPublishCountdownLabel,
} from "./listingPublishCountdown";
import type { RentalListing } from "./types";

const now = Date.parse("2026-05-17T12:00:00.000Z");

function base(overrides: Partial<RentalListing>): RentalListing {
  return {
    id: "1",
    title: "דירה",
    city: "תל אביב",
    neighborhood: "מרכז",
    streetHint: "",
    priceIls: 5000,
    rooms: 3,
    sizeSqm: 70,
    floor: 2,
    totalFloors: 5,
    entryDate: "מיידי",
    imageUrl: "https://example.com/a.jpg",
    gallery: ["https://example.com/a.jpg"],
    features: [],
    description: "",
    status: "active",
    publishedAt: "2026-01-01T00:00:00.000Z",
    expiresAt: "2026-05-20T00:00:00.000Z",
    publisher: { id: "u1", displayName: "בדיקה", responseTimeLabel: "—" },
    ...overrides,
  };
}

describe("listingPublishCountdown", () => {
  it("counts days until expiresAt for active listing", () => {
    const c = getListingPublishCountdown(base({ status: "active" }), now);
    expect(c?.days).toBe(3);
    expect(c?.variant).toBe("running");
    expect(listingPublishCountdownLabel(base({ status: "active" }), now)).toBe("עוד 3 ימים בלוח");
  });

  it("shows paused saved days for moderation draft", () => {
    const listing = base({
      status: "draft",
      moderationAction: "returned_to_draft",
      publishRemainingMs: 12 * 24 * 60 * 60 * 1000,
    });
    expect(getListingPublishCountdown(listing, now)?.variant).toBe("paused");
    expect(listingPublishCountdownLabel(listing, now)).toContain("מושהית");
  });
});
