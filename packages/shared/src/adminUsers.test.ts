import { describe, expect, it } from "vitest";
import { parseUserBannedFromClaims } from "./adminUsers";

describe("parseUserBannedFromClaims", () => {
  it("returns true when banned claim is set", () => {
    expect(parseUserBannedFromClaims({ banned: true })).toBe(true);
  });

  it("returns false otherwise", () => {
    expect(parseUserBannedFromClaims({})).toBe(false);
    expect(parseUserBannedFromClaims({ banned: false })).toBe(false);
    expect(parseUserBannedFromClaims(undefined)).toBe(false);
  });
});
