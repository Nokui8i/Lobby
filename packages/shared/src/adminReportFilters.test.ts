import { describe, expect, it } from "vitest";
import { filterAdminListingReports } from "./adminReportFilters";
import type { ListingReportRecord } from "./listingReports";

function sampleReport(overrides: Partial<ListingReportRecord> = {}): ListingReportRecord {
  return {
    id: "r1",
    listingId: "l1",
    listingTitle: "דירה בתל אביב",
    reporterId: "rep1",
    reporterEmail: "reporter@test.com",
    publisherId: "pub1",
    publisherEmail: "owner@test.com",
    reason: "scam",
    reasonLabel: "חשד להונאה",
    otherDetails: "טקסט חופשי",
    status: "open",
    createdAt: "2026-05-10T10:00:00.000Z",
    ...overrides,
  };
}

describe("filterAdminListingReports", () => {
  const reports = [
    sampleReport({ id: "old", createdAt: "2026-05-01T10:00:00.000Z", status: "resolved" }),
    sampleReport({ id: "new", createdAt: "2026-05-15T10:00:00.000Z", reason: "fake_listing", reasonLabel: "מזויפת" }),
  ];

  it("filters open only and sorts newest first", () => {
    const result = filterAdminListingReports(reports, {
      statusTab: "open",
      reason: "",
      sort: "newest",
      search: "",
    });
    expect(result.map((r) => r.id)).toEqual(["new"]);
  });

  it("filters by reason and search text", () => {
    const result = filterAdminListingReports(reports, {
      statusTab: "all",
      reason: "fake_listing",
      sort: "oldest",
      search: "owner@test",
    });
    expect(result.map((r) => r.id)).toEqual(["new"]);
  });
});
