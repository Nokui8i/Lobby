import type { ListingReportRecord } from "./listingReports";
import type { ReportReason } from "./types";
import { REPORT_REASON_LABELS } from "./types";

export const REPORT_SORT_ORDERS = ["newest", "oldest"] as const;
export type ReportSortOrder = (typeof REPORT_SORT_ORDERS)[number];

export const REPORT_STATUS_TABS = ["open", "all"] as const;
export type ReportStatusTab = (typeof REPORT_STATUS_TABS)[number];

export const REPORT_REASON_FILTER_OPTIONS: { id: ReportReason | ""; label: string }[] = [
  { id: "", label: "כל סוגי הדיווח" },
  ...(
    Object.entries(REPORT_REASON_LABELS) as [ReportReason, string][]
  ).map(([id, label]) => ({ id, label })),
];

export type AdminReportListFilters = {
  statusTab: ReportStatusTab;
  reason: ReportReason | "";
  sort: ReportSortOrder;
  search: string;
};

export const DEFAULT_ADMIN_REPORT_FILTERS: AdminReportListFilters = {
  statusTab: "open",
  reason: "",
  sort: "newest",
  search: "",
};

export function filterAdminListingReports(
  reports: ListingReportRecord[],
  filters: AdminReportListFilters,
): ListingReportRecord[] {
  let out = reports;

  if (filters.statusTab === "open") {
    out = out.filter((r) => r.status !== "resolved");
  }

  if (filters.reason) {
    out = out.filter((r) => r.reason === filters.reason);
  }

  const q = filters.search.trim().toLowerCase();
  if (q) {
    out = out.filter((r) => reportMatchesSearchQuery(r, q));
  }

  return [...out].sort((a, b) => {
    const ta = Date.parse(a.createdAt) || 0;
    const tb = Date.parse(b.createdAt) || 0;
    return filters.sort === "oldest" ? ta - tb : tb - ta;
  });
}

function reportMatchesSearchQuery(report: ListingReportRecord, q: string): boolean {
  const haystack = [
    report.listingTitle,
    report.listingId,
    report.reasonLabel,
    report.otherDetails,
    report.reporterEmail,
    report.reporterDisplayName,
    report.reporterId,
    report.publisherEmail,
    report.publisherDisplayName,
    report.publisherId,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}
