import type { LobbyInAppNotification, LobbyNotificationKind } from "./notifications";
import { firestoreTimestampToMillis } from "./chatFormat";

const VALID_KINDS = new Set<LobbyNotificationKind>([
  "chat_message",
  "listing_expiring",
  "listing_expired",
  "listing_published",
  "system",
]);

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

export function notificationFromFirestorePayload(
  docId: string,
  data: Record<string, unknown>,
): LobbyInAppNotification | null {
  const userId = asString(data.userId);
  const title = asString(data.title).trim();
  const body = asString(data.body).trim();
  const kindRaw = asString(data.kind, "system");

  if (!userId || !title) {
    return null;
  }

  const kind = VALID_KINDS.has(kindRaw as LobbyNotificationKind)
    ? (kindRaw as LobbyNotificationKind)
    : "system";

  return {
    id: docId,
    userId,
    fromUserId: asString(data.fromUserId) || undefined,
    kind,
    title,
    body,
    read: data.read === true,
    createdAtMs: firestoreTimestampToMillis(data.createdAt),
    threadId: asString(data.threadId) || undefined,
    listingId: asString(data.listingId) || undefined,
  };
}
