"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import {
  formatChatMessageTime,
  formatNotificationBodyForDisplay,
  resolveLobbyNotificationNavigation,
  type LobbyInAppNotification,
} from "@lobby/shared";
import { useLobbyAuth } from "@/contexts/LobbyAuthContext";
import { useLobbyNotifications } from "@/contexts/LobbyNotificationsContext";
import { isFirebaseConfigured } from "@/lib/firebase/isConfigured";
import { markAllNotificationsRead, markNotificationRead } from "@/lib/firebase/notifications";
import styles from "./notifications.module.css";

function openTarget(router: ReturnType<typeof useRouter>, item: LobbyInAppNotification) {
  const nav = resolveLobbyNotificationNavigation(item);
  if (!nav) {
    return;
  }
  if (nav.type === "chat") {
    router.push(`/chat/${nav.threadId}`);
    return;
  }
  if (nav.type === "account") {
    router.push("/account?tab=draft");
    return;
  }
  if (nav.type === "publish") {
    router.push(`/publish?listingId=${nav.listingId}`);
    return;
  }
  if (nav.type === "contact") {
    router.push("/contact");
    return;
  }
  if (nav.type === "listing") {
    router.push(`/listings/${nav.listingId}`);
  }
}

export function NotificationsClient() {
  const router = useRouter();
  const { user, loading: authLoading, openAuthModal } = useLobbyAuth();
  const { items, loading, unreadCount } = useLobbyNotifications();
  const [markingAll, setMarkingAll] = useState(false);

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

  const handleMarkAll = useCallback(async () => {
    if (unreadIds.length === 0 || markingAll) {
      return;
    }
    setMarkingAll(true);
    try {
      await markAllNotificationsRead(unreadIds);
    } finally {
      setMarkingAll(false);
    }
  }, [markingAll, unreadIds]);

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
          <button
            type="button"
            className={styles.markAllBtn}
            disabled={markingAll}
            onClick={() => void handleMarkAll()}
          >
            {markingAll ? "מסמן…" : "סמן הכל כנקרא"}
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
              <div className={styles.rowBody}>{formatNotificationBodyForDisplay(item)}</div>
              {timeLabel ? <div className={styles.rowTime}>{timeLabel}</div> : null}
            </button>
          );
        })}
      </div>
    </main>
  );
}
