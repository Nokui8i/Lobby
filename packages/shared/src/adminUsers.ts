import type { StaffRole } from "./staffRoles";

export type AdminUserRecord = {
  id: string;
  email: string | null;
  displayName: string;
  banned: boolean;
  banReason?: string;
  bannedAt?: string;
  createdAt: string;
  updatedAt: string;
  providers: string[];
  isStaff: boolean;
  /** תפקיד צוות — רק אם isStaff */
  staffRole?: StaffRole | null;
};

export function parseUserBannedFromClaims(claims: Record<string, unknown> | undefined): boolean {
  return claims?.banned === true;
}

/** חשבון בעלים — אסור לחשוף או לפעול עליו מעובד/מנהל. */
export function isProtectedOwnerUser(
  user: Pick<AdminUserRecord, "id" | "staffRole">,
): boolean {
  return user.staffRole === "owner";
}
