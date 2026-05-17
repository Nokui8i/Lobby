export const LISTINGS_COLLECTION = "listings" as const;
export const CHAT_THREADS_COLLECTION = "chatThreads" as const;
export const LISTING_REPORTS_COLLECTION = "listingReports" as const;
export const USERS_COLLECTION = "users" as const;

export { NOTIFICATIONS_COLLECTION } from "./notifications";

/** אורך מקסימלי להודעת צ׳אט (כולל בבדיקת כללי Firestore) */
export const CHAT_MESSAGE_MAX_LENGTH = 2000;

/** שמירת שרשורי צ׳אט ב-Firestore לפני מחיקה אוטומטית (Cloud Function יומית) */
export const CHAT_RETENTION_DAYS = 365;

/**
 * מזהה שרשור דטרמיניסטי לזוג משתתפים על מודעה אחת (אותו מזהה באתר ובאפליקציה).
 */
export function buildChatThreadId(listingId: string, uidA: string, uidB: string): string {
  const sorted = [uidA, uidB].sort();
  return `${listingId}__${sorted[0]}__${sorted[1]}`;
}
