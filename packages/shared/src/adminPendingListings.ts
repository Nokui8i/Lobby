export interface AdminPendingListingRecord {
  id: string;
  title: string;
  publisherId: string;
  resubmittedAt: string;
  publishRemainingDays: number;
}

export type AdminPendingListingDecision = "approve" | "reject";
