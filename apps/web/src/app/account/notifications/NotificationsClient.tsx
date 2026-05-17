"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo } from "react";
import { formatChatMessageTime, type LobbyInAppNotification } from "@lobby/shared";
import { useLobbyAuth } from "@/contexts/LobbyAuthContext";
import { useLobbyNotifications } from "@/contexts/LobbyNotificationsContext";
import { isFirebaseConfigured } from "@/lib/firebase/isConfigured";
import { markAllNotificationsRead, markNotificationRead } from "@/lib/firebase/notifications";
import styles from "./notifications.module.css";

function openTarget(router: ReturnType<typeof useRouter>, item: LobbyInAppNotification) {
  if (item.kind === "chat_message" && item.threadId) {
    router.push(`/chat/${item.threadId}`);
    return;
  }
  if (item.kind === "listing_expired" || item.kind === "listing_expiring") {
    router.push("/account");
    return;
  }
  if (item.listingId) {
    router.push(`/listings/${item.listingId}`);
  }
}

export function NotificationsClient() {
  const router = useRouter();
  const { user, loading: authLoading, openAuthModal } = useLobbyAuth();
  const { items, loading, unreadCount } = useLobbyNotifications();

  const unreadIds = useMemo(() => items.filter((n) => !n.read).map((n) => n.id), [items]);

  const handleOpen = useCallback(
    (item: LobbyInAppNotification) => {
      if (!item.read) {
        void markNotificationRead(item.id);
      }
      openTarget(router, item);
    },
    [router],
  );

  const handleMarkAll = useCallback(() => {
    void markAllNotificationsRead(unreadIds);
  }, [unreadIds]);

  if (!isFirebaseConfigured()) {
    return (
      <main className={styles.main}>
        <p className={styles.muted}>אין חיבור לשרת.</p>
      </main>
    );
  }

  if (authLoading) {
    return (
      <main className={styles.main}>
        <p className={styles.muted}>טוען…</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className={styles.main}>
        <Link href="/account" className={styles.back}>
          חזרה
        </Link>
        <p className={styles.muted}>
          <button type="button" onClick={openAuthModal} style={{ font: "inherit", fontWeight: 800 }}>
            כניסה
          </button>
        </p>
      </main>
    );
  }

  return (
    <main className={styles.main}>
      <Link href="/account" className={styles.back}>
        חזרה
      </Link>
      <div className={styles.topRow}>
        <h1 className={styles.title}>התראות</h1>
        {unreadCount > 0 ? (
          <button type="button" className={styles.markAll} onClick={handleMarkAll}>
            סימון הכל כנקרא
          </button>
        ) : null}
      </div>
      {loading && items.length === 0 ? <p className={styles.muted}>טוען…</p> : null}
      {!loading && items.length === 0 ? <p className={styles.muted}>אין עדכונים.</p> : null}
      <div className={styles.list}>
        {items.map((item) => {
          const timeLabel = formatChatMessageTime(item.createdAtMs);
          return (
            <button
              key={item.id}
              type="button"
              className={`${styles.row} ${!item.read ? styles.rowUnread : ""}`}
              onClick={() => handleOpen(item)}
            >
              <div className={styles.rowTitle}>{item.title}</div>
              <div className={styles.rowBody}>{item.body}</div>
              {timeLabel ? <div className={styles.rowTime}>{timeLabel}</div> : null}
            </button>
          );
        })}
      </div>
    </main>
  );
}
