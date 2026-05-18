import * as Notifications from "expo-notifications";
import { useEffect } from "react";

export function useNotificationResponseNavigation(
  onOpen: (data: { threadId?: string; inquiryId?: string; listingId?: string }) => void,
) {
  useEffect(() => {
    const navigate = (raw: Record<string, unknown> | undefined) => {
      if (!raw || typeof raw !== "object") {
        return;
      }
      const threadId = typeof raw.threadId === "string" ? raw.threadId : undefined;
      const inquiryId =
        (typeof raw.supportInquiryId === "string" && raw.supportInquiryId) ||
        (typeof raw.inquiryId === "string" && raw.inquiryId) ||
        undefined;
      const listingId = typeof raw.listingId === "string" ? raw.listingId : undefined;
      if (inquiryId) {
        onOpen({ inquiryId });
        return;
      }
      if (threadId || listingId) {
        onOpen({ threadId, listingId });
      }
    };

    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      navigate(response.notification.request.content.data as Record<string, unknown>);
    });

    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (!response) {
        return;
      }
      const openedMs = response.notification.date;
      const ms = typeof openedMs === "number" ? (openedMs > 1e12 ? openedMs : openedMs * 1000) : 0;
      if (ms > 0 && Date.now() - ms > 120_000) {
        return;
      }
      navigate(response.notification.request.content.data as Record<string, unknown>);
    });

    return () => sub.remove();
  }, [onOpen]);
}
