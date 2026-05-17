export const STAFF_ROLES = ["moderator", "admin", "owner"] as const;

export type StaffRole = (typeof STAFF_ROLES)[number];

/** תפקידים שהבעלים יכול להקצות בממשק (לא כולל owner). */
export const ASSIGNABLE_STAFF_ROLES = ["moderator", "admin"] as const;

export type AssignableStaffRole = (typeof ASSIGNABLE_STAFF_ROLES)[number];

export const STAFF_ROLE_LABELS: Record<StaffRole, string> = {
  moderator: "עובד",
  admin: "מנהל",
  owner: "בעלים",
};

export const STAFF_ROLE_LABELS_LONG: Record<StaffRole, string> = {
  moderator: "עובד תמיכה",
  admin: "מנהל תפעול",
  owner: "בעלים",
};

/**
 * מטריצת הרשאות — מינימום תפקיד לפעולה.
 * עובד: דיווחים, לקוחות, פניות (עתיד).
 * מנהל: + מודעות/תשלומים (עתיד).
 * בעלים: + צוות, מחיקת לקוח, תוכן אתר.
 */
export const ADMIN_ACTIONS = [
  "dashboard.view",
  "reports.view",
  "reports.update",
  "users.search",
  "users.ban",
  "users.password_reset",
  "users.delete",
  "users.manage_staff",
  "listings.moderate",
  "inquiries.view",
  "payments.view",
  "site.edit",
] as const;

export type AdminActionId = (typeof ADMIN_ACTIONS)[number];

/** מסכי אדמין — הרשאות לפי תפקיד */
export type AdminNavId =
  | "dashboard"
  | "reports"
  | "listings"
  | "users"
  | "site"
  | "staff";

const NAV_MIN_ROLE: Record<AdminNavId, StaffRole> = {
  dashboard: "moderator",
  reports: "moderator",
  listings: "admin",
  users: "moderator",
  site: "owner",
  staff: "owner",
};

const ACTION_MIN_ROLE: Record<AdminActionId, StaffRole> = {
  "dashboard.view": "moderator",
  "reports.view": "moderator",
  "reports.update": "moderator",
  "users.search": "moderator",
  "users.ban": "moderator",
  "users.password_reset": "moderator",
  "users.delete": "owner",
  "users.manage_staff": "owner",
  "listings.moderate": "admin",
  "inquiries.view": "moderator",
  "payments.view": "admin",
  "site.edit": "owner",
};

const ROLE_RANK: Record<StaffRole, number> = {
  moderator: 1,
  admin: 2,
  owner: 3,
};

export function staffRoleMeetsMinimum(role: StaffRole, minimum: StaffRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[minimum];
}

export function staffCanAccessNav(role: StaffRole, navId: AdminNavId): boolean {
  return staffRoleMeetsMinimum(role, NAV_MIN_ROLE[navId]);
}

export function staffCanPerformAction(role: StaffRole, action: AdminActionId): boolean {
  return staffRoleMeetsMinimum(role, ACTION_MIN_ROLE[action]);
}

export function parseStaffRoleFromClaims(claims: Record<string, unknown>): StaffRole | null {
  const raw = claims.staffRole;
  if (typeof raw === "string" && (STAFF_ROLES as readonly string[]).includes(raw)) {
    return raw as StaffRole;
  }
  if (claims.admin === true) {
    return "owner";
  }
  return null;
}

export function isAssignableStaffRole(raw: unknown): raw is AssignableStaffRole {
  return typeof raw === "string" && (ASSIGNABLE_STAFF_ROLES as readonly string[]).includes(raw);
}
