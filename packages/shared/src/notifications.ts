import { buildSupportChatRouteId } from "./supportInquiries";

export const NOTIFICATIONS_COLLECTION = "notifications" as const;

export type LobbyNotificationKind =
  | "chat_message"
  | "listing_expiring"
  | "listing_expired"
  | "listing_published"
  | "support_message"
  | "support_closed"
  | "support_resolved"
  | "system";

export const LOBBY_NOTIFICATION_KIND_LABEL_HE: Record<LobbyNotificationKind, string> = {
  chat_message: "הודעה",
  listing_expiring: "מודעה",
  listing_expired: "מודעה",
  listing_published: "מודעה",
  support_message: "תמיכה",
  support_closed: "תמיכה",
  support_resolved: "תמיכה",
  system: "מערכת",
};

/** לאן לנווט בלחיצה על התראה שקשורה למודעה */
export type LobbyNotificationListingTarget = "view" | "publish";

export interface LobbyInAppNotification {
  id: string;
  userId: string;
  fromUserId?: string;
  kind: LobbyNotificationKind;
  title: string;
  body: string;
  read: boolean;
  createdAtMs: number;
  threadId?: string;
  supportInquiryId?: string;
  listingId?: string;
  /** publish = עריכה/המשך פרסום; view = עמוד מודעה */
  listingTarget?: LobbyNotificationListingTarget;
}

export type LobbyNotificationNavigation =
  | { type: "chat"; threadId: string }
  | { type: "account" }
  | { type: "listing"; listingId: string }
  | { type: "publish"; listingId: string }
  | { type: "contact" }
  /** @deprecated — ניווט תמיכה מוחזר כ־chat עם מזהה support- */
  | { type: "support"; inquiryId: string };

/** ניווט אחיד להתראות (אתר + אפליקציה) */
/** התראות שמוחלפות בסימון unread בהודעות — לא מוצגות בעמוד התראות */
export function isMessagingNotificationKind(kind: LobbyNotificationKind): boolean {
  return (
    kind === "chat_message" ||
    kind === "support_message" ||
    kind === "support_closed" ||
    kind === "support_resolved"
  );
}

export function resolveLobbyNotificationNavigation(
  item: LobbyInAppNotification,
): LobbyNotificationNavigation | null {
  if (item.kind === "chat_message" && item.threadId) {
    return { type: "chat", threadId: item.threadId };
  }
  const supportId =
    (typeof item.supportInquiryId === "string" && item.supportInquiryId) ||
    (typeof item.threadId === "string" && item.kind.startsWith("support") ? item.threadId : "");
  if (
    supportId &&
    (item.kind === "support_message" || item.kind === "support_closed" || item.kind === "support_resolved")
  ) {
    return { type: "chat", threadId: buildSupportChatRouteId(supportId) };
  }
  if (item.kind === "listing_expired" || item.kind === "listing_expiring") {
    return { type: "account" };
  }
  if (!item.listingId) {
    return null;
  }
  if (
    item.listingTarget === "publish" ||
    item.title.trim() === "נדרש עדכון למודעה" ||
    item.title.trim() === "נדרש עדכון נוסף למודעה"
  ) {
    return { type: "publish", listingId: item.listingId };
  }
  return { type: "listing", listingId: item.listingId };
}

export const MODERATION_UPDATE_NOTIFICATION_TITLES_HE = [
  "נדרש עדכון למודעה",
  "נדרש עדכון נוסף למודעה",
] as const;

export const MODERATION_UPDATE_FREEZE_NOTICE_HE =
  "המודעה מוקפאת — ימי הפרסום (30) לא נספרים עד אישור וחזרה ללוח, כדי שלא תאבדו ימים ששילמתם עליהם.";

export function isModerationUpdateNotification(item: Pick<LobbyInAppNotification, "title">): boolean {
  const title = item.title.trim();
  return MODERATION_UPDATE_NOTIFICATION_TITLES_HE.some((t) => t === title);
}

/** טקסט מלא להצגה — כולל הסבר הקפאה גם בהתראות ישנות */
export function formatNotificationBodyForDisplay(item: LobbyInAppNotification): string {
  const body = item.body.trim();
  if (!isModerationUpdateNotification(item)) {
    return body;
  }
  if (body.includes("לא נספרים") || body.includes("מוקפאת")) {
    return body;
  }
  if (!body) {
    return MODERATION_UPDATE_FREEZE_NOTICE_HE;
  }
  return `${body}\n\n${MODERATION_UPDATE_FREEZE_NOTICE_HE}`;
}
