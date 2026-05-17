import type { ListingStatus } from "./types";
import type { ReportReason } from "./types";
import { REPORT_REASON_LABELS } from "./types";

export const ADMIN_MODERATION_DRAFT_NOTE_MAX = 500;

export const LISTING_REPORT_STATUSES = ["open", "in_progress", "resolved"] as const;

export type ListingReportStatus = (typeof LISTING_REPORT_STATUSES)[number];

export const LISTING_REPORT_STATUS_LABELS: Record<ListingReportStatus, string> = {
  open: "פתוח",
  in_progress: "בטיפול",
  resolved: "נסגר",
};

export type ListingReportModerationAction = "remove" | "return_to_draft";

export type ListingReportRecord = {
  id: string;
  listingId: string;
  listingTitle: string;
  reporterId: string;
  reporterEmail?: string;
  reporterDisplayName?: string;
  publisherId: string;
  publisherEmail?: string;
  publisherDisplayName?: string;
  listingStatus?: ListingStatus | "";
  reason: ReportReason;
  reasonLabel: string;
  otherDetails?: string;
  status: ListingReportStatus;
  createdAt: string;
};

export type AdminDashboardStats = {
  openReports: number;
  needsTreatmentReports: number;
  activeListings: number;
};

export function normalizeListingReportStatus(raw: unknown): ListingReportStatus {
  if (raw === "in_progress" || raw === "resolved") {
    return raw;
  }
  return "open";
}

export function listingReportNeedsTreatment(status: ListingReportStatus): boolean {
  return status === "open" || status === "in_progress";
}

export function listingReportReasonLabel(reason: ReportReason): string {
  return REPORT_REASON_LABELS[reason] ?? reason;
}
