export const NOTIFICATIONS_COLLECTION = "notifications" as const;

export type LobbyNotificationKind =
  | "chat_message"
  | "listing_expiring"
  | "listing_expired"
  | "listing_published"
  | "system";

export const LOBBY_NOTIFICATION_KIND_LABEL_HE: Record<LobbyNotificationKind, string> = {
  chat_message: "הודעה",
  listing_expiring: "מודעה",
  listing_expired: "מודעה",
  listing_published: "מודעה",
  system: "מערכת",
};

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
  listingId?: string;
}
