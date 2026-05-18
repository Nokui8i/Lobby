import { formatChatMessageTime } from "./chatFormat";

export const SUPPORT_INQUIRY_SUBJECT_MAX = 120;
export const SUPPORT_INQUIRY_MESSAGE_MAX = 2000;
/** @deprecated use SUPPORT_INQUIRY_MESSAGE_MAX */
export const SUPPORT_INQUIRY_BODY_MAX = SUPPORT_INQUIRY_MESSAGE_MAX;
export const SUPPORT_INQUIRY_STAFF_NOTE_MAX = 1000;
export const SUPPORT_INQUIRY_MAX_OPEN_PER_USER = 5;
export const SUPPORT_INQUIRY_RETENTION_DAYS = 365;
export const SUPPORT_INQUIRY_REOPEN_HOURS = 48;

/** הודעת מערכת בתחילת שיחת תמיכה (משתמש) */
export const SUPPORT_INQUIRY_AVAILABILITY_SYSTEM_MESSAGE =
  "צוות התמיכה עונה כשהוא פנוי. לפנייה חדשה לאחר סגירה — שלחו פנייה חדשה מדף יצירת קשר.";

/** מספר פנייה ציבורי (סידורי) — להצגה למשתמש ולצוות */
export const SUPPORT_INQUIRY_REFERENCE_START = 100001;

export const SUPPORT_INQUIRY_STATUSES = ["open", "closed"] as const;

export type SupportInquiryStatus = (typeof SUPPORT_INQUIRY_STATUSES)[number];

export const SUPPORT_INQUIRY_STATUS_LABELS: Record<SupportInquiryStatus, string> = {
  open: "פתוח",
  closed: "נסגר",
};

export const SUPPORT_INQUIRY_SENDER_ROLES = ["user", "staff"] as const;

export type SupportInquirySenderRole = (typeof SUPPORT_INQUIRY_SENDER_ROLES)[number];

export const SUPPORT_INQUIRY_CATEGORIES = [
  "account",
  "listing",
  "technical",
  "safety",
  "accessibility",
  "other",
] as const;

export type SupportInquiryCategory = (typeof SUPPORT_INQUIRY_CATEGORIES)[number];

export const SUPPORT_INQUIRY_CATEGORY_LABELS: Record<SupportInquiryCategory, string> = {
  account: "חשבון והתחברות",
  listing: "מודעה / פרסום",
  technical: "תקלה טכנית",
  safety: "בטיחות / הונאה",
  accessibility: "נגישות",
  other: "אחר",
};

export type SupportInquiryMessageRecord = {
  id: string;
  senderId: string;
  senderRole: SupportInquirySenderRole;
  text: string;
  createdAt: string;
};

export type SupportInquiryRecord = {
  id: string;
  referenceNumber: number;
  userId: string;
  userEmail: string;
  displayName: string;
  category: SupportInquiryCategory;
  categoryLabel: string;
  subject: string;
  listingId: string;
  listingTitle: string;
  status: SupportInquiryStatus;
  lastMessagePreview: string;
  lastMessageSenderRole: SupportInquirySenderRole | "";
  unreadForUser: number;
  unreadForStaff: number;
  userResolvedAt: string;
  assignedToUid: string;
  assignedToDisplayName: string;
  staffNote: string;
  closedByUid: string;
  closedByRole: SupportInquirySenderRole | "";
  createdAt: string;
  updatedAt: string;
  closedAt: string;
};

export type SupportInquiryListFilters = {
  status: SupportInquiryStatus | "all";
  category: SupportInquiryCategory | "all";
  search: string;
};

export const DEFAULT_SUPPORT_INQUIRY_FILTERS: SupportInquiryListFilters = {
  status: "all",
  category: "all",
  search: "",
};

/** תאימות לאחור: in_progress → open, resolved → closed */
export function normalizeSupportInquiryStatus(raw: unknown): SupportInquiryStatus {
  if (raw === "closed" || raw === "resolved") {
    return "closed";
  }
  return "open";
}

export function supportInquiryIsOpen(status: SupportInquiryStatus): boolean {
  return status === "open";
}

export function supportInquiryNeedsTreatment(status: SupportInquiryStatus): boolean {
  return supportInquiryIsOpen(status);
}

export function supportInquiryNeedsStaffAttention(
  inquiry: Pick<SupportInquiryRecord, "status" | "unreadForStaff" | "lastMessageSenderRole">,
): boolean {
  return supportInquiryIsOpen(inquiry.status) && inquiry.unreadForStaff > 0;
}

export function supportInquiryCanStaffReopen(
  inquiry: Pick<SupportInquiryRecord, "status" | "closedAt">,
  nowMs: number = Date.now(),
): boolean {
  if (supportInquiryIsOpen(inquiry.status) || !inquiry.closedAt) {
    return false;
  }
  const closedMs = Date.parse(inquiry.closedAt);
  if (!Number.isFinite(closedMs)) {
    return false;
  }
  return nowMs - closedMs <= SUPPORT_INQUIRY_REOPEN_HOURS * 60 * 60 * 1000;
}

export function supportInquiryCategoryLabel(category: SupportInquiryCategory): string {
  return SUPPORT_INQUIRY_CATEGORY_LABELS[category] ?? category;
}

export function isValidSupportInquiryCategory(raw: unknown): raw is SupportInquiryCategory {
  return typeof raw === "string" && (SUPPORT_INQUIRY_CATEGORIES as readonly string[]).includes(raw);
}

export function validateSupportInquirySubject(subject: string): boolean {
  const trimmed = subject.trim();
  return trimmed.length >= 2 && trimmed.length <= SUPPORT_INQUIRY_SUBJECT_MAX;
}

export function validateSupportInquiryMessage(text: string): boolean {
  const trimmed = text.trim();
  return trimmed.length >= 1 && trimmed.length <= SUPPORT_INQUIRY_MESSAGE_MAX;
}

/** @deprecated use validateSupportInquiryMessage */
export function validateSupportInquiryBody(body: string): boolean {
  const trimmed = body.trim();
  return trimmed.length >= 10 && trimmed.length <= SUPPORT_INQUIRY_MESSAGE_MAX;
}

/** מזהה נתיב ב־/chat — לא מתנגש עם מזהי שרשור מודעה */
export const SUPPORT_CHAT_ROUTE_PREFIX = "support-" as const;

export function buildSupportChatRouteId(inquiryId: string): string {
  return `${SUPPORT_CHAT_ROUTE_PREFIX}${inquiryId}`;
}

export function isSupportChatRouteId(routeId: string): boolean {
  return routeId.startsWith(SUPPORT_CHAT_ROUTE_PREFIX);
}

export function parseSupportChatRouteId(routeId: string): string | null {
  if (!isSupportChatRouteId(routeId)) {
    return null;
  }
  const inquiryId = routeId.slice(SUPPORT_CHAT_ROUTE_PREFIX.length).trim();
  return inquiryId || null;
}

/** נתיב שיחת תמיכה בתוך הודעות (אתר) */
export function supportInquiryMessagesPath(inquiryId: string): string {
  return `/chat/${buildSupportChatRouteId(inquiryId)}`;
}

export function formatSupportInquiryReference(referenceNumber: number): string {
  if (!Number.isFinite(referenceNumber) || referenceNumber <= 0) {
    return "—";
  }
  return String(Math.floor(referenceNumber));
}

export type SupportInquirySystemIntroInput = Pick<
  SupportInquiryRecord,
  "referenceNumber" | "categoryLabel" | "subject" | "listingTitle" | "userResolvedAt"
> & { createdAt?: unknown };

/** שורות הודעת מערכת בתחילת שיחת תמיכה — ללא שמירה ב-Firestore */
export function buildSupportInquiryThreadSystemLines(inquiry: SupportInquirySystemIntroInput): string[] {
  const createdLabel = inquiry.createdAt ? formatChatMessageTime(inquiry.createdAt) : "";
  const header = `פנייה #${formatSupportInquiryReference(inquiry.referenceNumber)} · ${inquiry.categoryLabel}`;
  let detail = inquiry.subject;
  if (createdLabel) {
    detail += ` · ${createdLabel}`;
  }
  if (inquiry.listingTitle) {
    detail += ` · ${inquiry.listingTitle}`;
  }

  const lines = [header, detail, SUPPORT_INQUIRY_AVAILABILITY_SYSTEM_MESSAGE];
  if (inquiry.userResolvedAt) {
    lines.push("סימנתם שהבעיה נפתרה — הצוות עדיין יכול לענות.");
  }
  return lines;
}

/** מיון רשימת משתמש: לא נקראו קודם, אחר כך עדכון אחרון */
export function sortSupportInquiriesForUser(
  a: Pick<SupportInquiryRecord, "updatedAt" | "unreadForUser">,
  b: Pick<SupportInquiryRecord, "updatedAt" | "unreadForUser">,
): number {
  const aUnread = (a.unreadForUser ?? 0) > 0 ? 1 : 0;
  const bUnread = (b.unreadForUser ?? 0) > 0 ? 1 : 0;
  if (aUnread !== bUnread) {
    return bUnread - aUnread;
  }
  const aMs = Date.parse(a.updatedAt) || 0;
  const bMs = Date.parse(b.updatedAt) || 0;
  return bMs - aMs;
}

/** מיון רשימת צוות: מחכות לנו קודם, אחר כך עדכון אחרון */
export function sortSupportInquiriesForStaff(a: SupportInquiryRecord, b: SupportInquiryRecord): number {
  const aUnread = a.unreadForStaff > 0 ? 1 : 0;
  const bUnread = b.unreadForStaff > 0 ? 1 : 0;
  if (aUnread !== bUnread) {
    return bUnread - aUnread;
  }
  const aMs = Date.parse(a.updatedAt) || 0;
  const bMs = Date.parse(b.updatedAt) || 0;
  return bMs - aMs;
}
