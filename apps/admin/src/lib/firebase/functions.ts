import { getFunctions, httpsCallable } from "firebase/functions";
import type {
  AdminDashboardStats,
  AdminUserRecord,
  AssignableStaffRole,
  ListingReportModerationAction,
  ListingReportRecord,
  ListingReportStatus,
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
