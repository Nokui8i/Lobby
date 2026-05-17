import { describe, expect, it } from "vitest";
import { listingReportNeedsTreatment, normalizeListingReportStatus } from "./listingReports";

describe("listingReports", () => {
  it("normalizes missing status as open", () => {
    expect(normalizeListingReportStatus(undefined)).toBe("open");
  });

  it("detects treatment-needed statuses", () => {
    expect(listingReportNeedsTreatment("open")).toBe(true);
    expect(listingReportNeedsTreatment("in_progress")).toBe(true);
    expect(listingReportNeedsTreatment("resolved")).toBe(false);
  });
});
