import { getFunctions, httpsCallable } from "firebase/functions";
import type {
  AdminDashboardStats,
  AdminListingDetail,
  AdminListingListFilters,
  AdminListingModerationAction,
  AdminListingRecord,
  AdminListingUpdateInput,
  AdminPendingListingDecision,
  AdminPendingListingRecord,
  AdminUserRecord,
  AssignableStaffRole,
  ListingReportModerationAction,
  ListingReportRecord,
  ListingReportStatus,
  SupportInquiryRecord,
} from "@lobby/shared";
import { getFirebaseApp } from "./client";

function lobbyFunctions() {
  return getFunctions(getFirebaseApp(), "us-central1");
}

export async function fetchAdminDashboardStats(): Promise<AdminDashboardStats> {
  const fn = httpsCallable<Record<string, never>, AdminDashboardStats>(
    lobbyFunctions(),
    "lobbyAdminGetDashboardStats",
  );
  const result = await fn({});
  return result.data;
}

export async function fetchAdminReports(): Promise<ListingReportRecord[]> {
  const fn = httpsCallable<Record<string, never>, { reports: ListingReportRecord[] }>(
    lobbyFunctions(),
    "lobbyAdminListReports",
  );
  const result = await fn({});
  return result.data.reports;
}

export async function updateAdminReportStatus(
  reportId: string,
  status: ListingReportStatus,
): Promise<void> {
  const fn = httpsCallable<{ reportId: string; status: ListingReportStatus }, { ok: boolean }>(
    lobbyFunctions(),
    "lobbyAdminUpdateReportStatus",
  );
  await fn({ reportId, status });
}

export async function fetchAdminListings(
  filters: Partial<AdminListingListFilters> = {},
): Promise<AdminListingRecord[]> {
  const fn = httpsCallable<Partial<AdminListingListFilters>, { listings: AdminListingRecord[] }>(
    lobbyFunctions(),
    "lobbyAdminListListings",
  );
  const result = await fn({
    status: filters.status || undefined,
    publisherId: filters.publisherId?.trim() || undefined,
    listingId: filters.listingId?.trim() || undefined,
    search: filters.search?.trim() || undefined,
  });
  return result.data.listings;
}

export async function fetchAdminListing(listingId: string): Promise<AdminListingDetail> {
  const fn = httpsCallable<{ listingId: string }, { listing: AdminListingDetail }>(
    lobbyFunctions(),
    "lobbyAdminGetListing",
  );
  const result = await fn({ listingId });
  return result.data.listing;
}

export async function updateAdminListing(
  input: AdminListingUpdateInput,
): Promise<AdminListingDetail> {
  const fn = httpsCallable<AdminListingUpdateInput, { ok: boolean; listing: AdminListingDetail }>(
    lobbyFunctions(),
    "lobbyAdminUpdateListing",
  );
  const result = await fn(input);
  return result.data.listing;
}

export async function moderateAdminListing(
  listingId: string,
  action: AdminListingModerationAction,
  draftNote?: string,
): Promise<AdminListingDetail> {
  const fn = httpsCallable<
    { listingId: string; action: AdminListingModerationAction; draftNote?: string },
    { ok: boolean; listing: AdminListingDetail }
  >(lobbyFunctions(), "lobbyAdminModerateListing");
  const result = await fn({ listingId, action, draftNote: draftNote?.trim() || undefined });
  return result.data.listing;
}

export async function fetchAdminPendingListings(): Promise<AdminPendingListingRecord[]> {
  const fn = httpsCallable<Record<string, never>, { listings: AdminPendingListingRecord[] }>(
    lobbyFunctions(),
    "lobbyAdminListPendingListings",
  );
  const result = await fn({});
  return result.data.listings;
}

export async function decideAdminPendingListing(
  listingId: string,
  decision: AdminPendingListingDecision,
  rejectNote?: string,
): Promise<void> {
  const fn = httpsCallable<
    { listingId: string; decision: AdminPendingListingDecision; rejectNote?: string },
    { ok: boolean }
  >(lobbyFunctions(), "lobbyAdminDecidePendingListing");
  await fn({ listingId, decision, rejectNote: rejectNote?.trim() || undefined });
}

export async function moderateListingFromReport(
  reportId: string,
  action: ListingReportModerationAction,
  draftNote?: string,
): Promise<ListingReportRecord> {
  const fn = httpsCallable<
    { reportId: string; action: ListingReportModerationAction; draftNote?: string },
    { ok: boolean; report: ListingReportRecord }
  >(lobbyFunctions(), "lobbyAdminModerateListingFromReport");
  const result = await fn({ reportId, action, draftNote: draftNote?.trim() || undefined });
  return result.data.report;
}

export async function searchAdminUsers(query: string): Promise<AdminUserRecord[]> {
  const fn = httpsCallable<{ query?: string }, { users: AdminUserRecord[] }>(
    lobbyFunctions(),
    "lobbyAdminSearchUsers",
  );
  const result = await fn({ query: query.trim() || undefined });
  return result.data.users;
}

export async function banAdminUser(userId: string, reason?: string): Promise<AdminUserRecord> {
  const fn = httpsCallable<{ userId: string; reason?: string }, { ok: boolean; user: AdminUserRecord }>(
    lobbyFunctions(),
    "lobbyAdminBanUser",
  );
  const result = await fn({ userId, reason });
  return result.data.user;
}

export async function unbanAdminUser(userId: string): Promise<AdminUserRecord> {
  const fn = httpsCallable<{ userId: string }, { ok: boolean; user: AdminUserRecord }>(
    lobbyFunctions(),
    "lobbyAdminUnbanUser",
  );
  const result = await fn({ userId });
  return result.data.user;
}

export type PasswordResetAdminResult = {
  ok: boolean;
  emailSent: boolean;
  message: string;
  resetLink?: string;
};

export async function sendAdminPasswordReset(userId: string): Promise<PasswordResetAdminResult> {
  const fn = httpsCallable<{ userId: string }, PasswordResetAdminResult>(
    lobbyFunctions(),
    "lobbyAdminSendPasswordReset",
  );
  const result = await fn({ userId });
  return result.data;
}

export async function deleteAdminUser(userId: string): Promise<void> {
  const fn = httpsCallable<{ userId: string }, { ok: boolean }>(lobbyFunctions(), "lobbyAdminDeleteUser");
  await fn({ userId });
}

export async function fetchAdminStaff(): Promise<AdminUserRecord[]> {
  const fn = httpsCallable<Record<string, never>, { staff: AdminUserRecord[] }>(
    lobbyFunctions(),
    "lobbyAdminListStaff",
  );
  const result = await fn({});
  return result.data.staff;
}

export async function setAdminStaffRole(
  userId: string,
  role: AssignableStaffRole,
): Promise<AdminUserRecord> {
  const fn = httpsCallable<
    { userId: string; role: AssignableStaffRole },
    { ok: boolean; user: AdminUserRecord }
  >(lobbyFunctions(), "lobbyAdminSetStaffRole");
  const result = await fn({ userId, role });
  return result.data.user;
}

export async function revokeAdminStaffRole(userId: string): Promise<AdminUserRecord> {
  const fn = httpsCallable<{ userId: string }, { ok: boolean; user: AdminUserRecord }>(
    lobbyFunctions(),
    "lobbyAdminRevokeStaffRole",
  );
  const result = await fn({ userId });
  return result.data.user;
}

export async function fetchAdminSupportInquiries(): Promise<SupportInquiryRecord[]> {
  const fn = httpsCallable<Record<string, never>, { inquiries: SupportInquiryRecord[] }>(
    lobbyFunctions(),
    "lobbyAdminListSupportInquiries",
  );
  const result = await fn({});
  return result.data.inquiries;
}

export async function updateAdminSupportInquiry(
  inquiryId: string,
  patch: { staffNote?: string },
): Promise<SupportInquiryRecord> {
  const fn = httpsCallable<
    { inquiryId: string; staffNote?: string },
    { ok: boolean; inquiry: SupportInquiryRecord }
  >(lobbyFunctions(), "lobbyAdminUpdateSupportInquiry");
  const result = await fn({ inquiryId, ...patch });
  return result.data.inquiry;
}

export async function sendAdminSupportInquiryMessage(inquiryId: string, text: string): Promise<void> {
  const fn = httpsCallable<{ inquiryId: string; text: string }, { ok: boolean }>(
    lobbyFunctions(),
    "lobbyAdminSendSupportInquiryMessage",
  );
  await fn({ inquiryId, text });
}

export async function closeAdminSupportInquiry(inquiryId: string): Promise<SupportInquiryRecord> {
  const fn = httpsCallable<{ inquiryId: string }, { ok: boolean; inquiry: SupportInquiryRecord }>(
    lobbyFunctions(),
    "lobbyAdminCloseSupportInquiry",
  );
  const result = await fn({ inquiryId });
  return result.data.inquiry;
}

export async function reopenAdminSupportInquiry(inquiryId: string): Promise<SupportInquiryRecord> {
  const fn = httpsCallable<{ inquiryId: string }, { ok: boolean; inquiry: SupportInquiryRecord }>(
    lobbyFunctions(),
    "lobbyAdminReopenSupportInquiry",
  );
  const result = await fn({ inquiryId });
  return result.data.inquiry;
}

export async function claimAdminSupportInquiry(
  inquiryId: string,
): Promise<{ inquiry: SupportInquiryRecord; alreadyAssigned: boolean }> {
  const fn = httpsCallable<
    { inquiryId: string },
    { ok: boolean; inquiry: SupportInquiryRecord; alreadyAssigned?: boolean }
  >(lobbyFunctions(), "lobbyAdminClaimSupportInquiry");
  const result = await fn({ inquiryId });
  return {
    inquiry: result.data.inquiry,
    alreadyAssigned: result.data.alreadyAssigned === true,
  };
}
