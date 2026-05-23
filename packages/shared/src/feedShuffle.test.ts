import { describe, expect, it } from "vitest";
import { createFeedShuffleSeed, orderFeedForDisplay, shuffleFeedListingsWithSeed } from "./feedShuffle";

const priced = [
  { priceIls: 5000, publishedAt: "2024-01-01T00:00:00.000Z" },
  { priceIls: 3000, publishedAt: "2024-06-01T00:00:00.000Z" },
  { priceIls: 8000, publishedAt: "2024-03-01T00:00:00.000Z" },
];

describe("shuffleFeedListingsWithSeed", () => {
  it("returns same order for same seed", () => {
    const input = ["a", "b", "c", "d", "e"];
    const a = shuffleFeedListingsWithSeed(input, 42);
    const b = shuffleFeedListingsWithSeed(input, 42);
    expect(a).toEqual(b);
    expect([...a].sort()).toEqual(input);
  });

  it("usually changes order for different seeds", () => {
    const input = Array.from({ length: 12 }, (_, i) => `id-${i}`);
    const a = shuffleFeedListingsWithSeed(input, 1);
    const b = shuffleFeedListingsWithSeed(input, 2);
    expect(a.join()).not.toBe(b.join());
  });

  it("handles empty and single item", () => {
    expect(shuffleFeedListingsWithSeed([], 99)).toEqual([]);
    expect(shuffleFeedListingsWithSeed(["only"], 99)).toEqual(["only"]);
  });
});

describe("orderFeedForDisplay", () => {
  it("shuffles when sort is newest and seed is set", () => {
    const sorted = orderFeedForDisplay(priced, "newest", null);
    const shuffled = orderFeedForDisplay(priced, "newest", 42);
    expect(sorted.map((x) => x.priceIls)).toEqual([3000, 8000, 5000]);
    expect(shuffled.map((x) => x.priceIls).join()).not.toBe(sorted.map((x) => x.priceIls).join());
  });

  it("keeps strict price order without shuffle", () => {
    const asc = orderFeedForDisplay(priced, "price_asc", 42);
    expect(asc.map((x) => x.priceIls)).toEqual([3000, 5000, 8000]);
  });
});

describe("createFeedShuffleSeed", () => {
  it("returns a non-negative integer", () => {
    const seed = createFeedShuffleSeed();
    expect(Number.isInteger(seed)).toBe(true);
    expect(seed).toBeGreaterThanOrEqual(0);
  });
});
