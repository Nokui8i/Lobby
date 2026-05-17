"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { formatChatMessageTime } from "@lobby/shared";
import { useLobbyAuth } from "@/contexts/LobbyAuthContext";
import { useChatInbox } from "@/contexts/ChatInboxContext";
import { isFirebaseConfigured } from "@/lib/firebase/isConfigured";
import styles from "./chat.module.css";

export function ChatListClient({ activeThreadId }: { activeThreadId?: string | null }) {
  const { user, loading, openAuthModal } = useLobbyAuth();
  const { threads, listLoading, listError } = useChatInbox();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredThreads = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      return threads;
    }
    return threads.filter((t) => {
      const title = (t.listingTitle || "").toLowerCase();
      const id = (t.listingId || "").toLowerCase();
      return title.includes(q) || id.includes(q);
    });
  }, [threads, searchQuery]);

  if (!isFirebaseConfigured()) {
    return (
      <div className={`${styles.shell} ${styles.shellPadded}`}>
        <p className={styles.muted}>אין חיבור ל־Firebase.</p>
        <Link href="/" className={styles.backLink}>
          דף הבית
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={`${styles.shell} ${styles.shellPadded}`}>
        <p className={styles.muted}>טוען…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className={`${styles.shell} ${styles.shellPadded}`}>
        <p>כדי לראות ולשלוח הודעות צריך להתחבר.</p>
        <button type="button" className={styles.ctaButton} onClick={openAuthModal}>
          כניסה / הרשמה
        </button>
      </div>
    );
  }

  return (
    <div className={styles.shell}>
      <div className={styles.listToolbar}>
        <h2 className={styles.listSectionTitle}>כל השיחות</h2>
      </div>

      {threads.length > 0 ? (
        <label className={styles.chatSearch}>
          <span className={styles.visuallyHidden}>חיפוש בשיחות</span>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="חיפוש לפי כותרת או מזהה מודעה…"
            dir="rtl"
            aria-controls="chat-thread-list"
          />
        </label>
      ) : null}

      {listLoading ? <p className={`${styles.muted} ${styles.listStatusPad}`}>טוען שיחות…</p> : null}
      {listError ? <p className={`${styles.listError} ${styles.listStatusPad}`}>{listError}</p> : null}

      {!listLoading && !listError && threads.length === 0 ? (
        <div className={styles.emptyChatWrap} aria-hidden>
          <div className={styles.emptyChatArt} />
        </div>
      ) : null}

      <div className={styles.listScroll} role="region" aria-label="רשימת שיחות">
        {filteredThreads.length > 0 ? (
          <ul id="chat-thread-list" className={styles.list}>
            {filteredThreads.map((thread) => {
              const active = activeThreadId === thread.id;
              const unread = thread.unreadForViewer ?? 0;
              const timeLabel = thread.lastMessageAt ? formatChatMessageTime(thread.lastMessageAt) : "";
              const preview = thread.lastMessagePreview;
              const mine = thread.lastMessageSenderId === user.uid;

              return (
                <li key={thread.id}>
                  <Link
                    href={`/chat/${thread.id}`}
                    className={`${styles.threadCard} ${active ? styles.threadCardActive : ""}`}
                    aria-current={active ? "page" : undefined}
                  >
                    <div className={styles.threadCardRow}>
                      <div className={styles.threadCardMain}>
                        <strong>{thread.listingTitle || "שיחה"}</strong>
                        {preview ? (
                          <p className={styles.threadPreview}>
                            {mine ? "אתם: " : ""}
                            {preview}
                          </p>
                        ) : null}
                        <span className={styles.threadListingMeta}>שיחה סביב המודעה</span>
                      </div>
                      <div className={styles.threadCardAside}>
                        {timeLabel ? <span className={styles.threadTime}>{timeLabel}</span> : null}
                        {unread > 0 ? (
                          <span className={styles.unreadBadge} aria-label={`${unread} הודעות שלא נקראו`}>
                            {unread > 99 ? "99+" : unread}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : threads.length > 0 && searchQuery.trim() ? (
          <p className={`${styles.muted} ${styles.listStatusPad}`}>אין תוצאות לחיפוש.</p>
        ) : null}
      </div>
    </div>
  );
}
