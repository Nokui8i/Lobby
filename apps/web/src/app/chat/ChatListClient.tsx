"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  DELETE_CHAT_THREAD_CONFIRM,
  DELETE_SUPPORT_INQUIRY_CONFIRM,
  SUPPORT_INQUIRY_STATUS_LABELS,
  buildSupportChatRouteId,
  formatChatMessageTime,
  formatLobbySendError,
  formatSupportInquiryReference,
  logLobbyError,
  supportInquiryIsOpen,
} from "@lobby/shared";
import { LobbyConfirmDialog } from "@/components/LobbyConfirmDialog";
import { ThreadCardMenu } from "@/components/messages/ThreadCardMenu";
import { useLobbyAuth } from "@/contexts/LobbyAuthContext";
import { useChatInbox } from "@/contexts/ChatInboxContext";
import { isFirebaseConfigured } from "@/lib/firebase/isConfigured";
import { deleteMyChatThread, deleteMySupportInquiry } from "@/lib/firebase/messagesDelete";
import { ensureFirestoreAuthReady } from "@/lib/firebase/client";
import styles from "./chat.module.css";

function activeRouteMatches(activeThreadId: string | null | undefined, rowId: string, kind: "chat" | "support") {
  if (!activeThreadId) {
    return false;
  }
  if (kind === "chat") {
    return activeThreadId === rowId;
  }
  return activeThreadId === buildSupportChatRouteId(rowId);
}

type PendingDelete =
  | { kind: "chat"; id: string; title: string }
  | { kind: "support"; id: string; title: string };

export function ChatListClient({ activeThreadId }: { activeThreadId?: string | null }) {
  const router = useRouter();
  const { user, loading, openAuthModal } = useLobbyAuth();
  const { inboxRows, listLoading, listError } = useChatInbox();
  const [searchQuery, setSearchQuery] = useState("");
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      return inboxRows;
    }
    return inboxRows.filter((row) => {
      if (row.kind === "chat") {
        const title = (row.chat.listingTitle || "").toLowerCase();
        const id = (row.chat.listingId || "").toLowerCase();
        return title.includes(q) || id.includes(q);
      }
      const subject = row.support.subject.toLowerCase();
      const ref = formatSupportInquiryReference(row.support.referenceNumber).toLowerCase();
      return subject.includes(q) || ref.includes(q);
    });
  }, [inboxRows, searchQuery]);

  async function handleConfirmDelete() {
    if (!user || !pendingDelete || deleting) {
      return;
    }

    setDeleting(true);
    setDeleteError(null);

    try {
      await ensureFirestoreAuthReady(user);
      if (pendingDelete.kind === "chat") {
        await deleteMyChatThread(pendingDelete.id);
        if (activeRouteMatches(activeThreadId, pendingDelete.id, "chat")) {
          router.push("/chat");
          router.refresh();
        }
      } else {
        await deleteMySupportInquiry(pendingDelete.id);
        if (activeRouteMatches(activeThreadId, pendingDelete.id, "support")) {
          router.push("/chat");
          router.refresh();
        }
      }
      setPendingDelete(null);
    } catch (err) {
      logLobbyError("delete conversation", err);
      setDeleteError(formatLobbySendError(err, "לא ניתן למחוק את השיחה."));
    } finally {
      setDeleting(false);
    }
  }

  const confirmCopy =
    pendingDelete?.kind === "support" ? DELETE_SUPPORT_INQUIRY_CONFIRM : DELETE_CHAT_THREAD_CONFIRM;

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

      {inboxRows.length > 0 ? (
        <label className={styles.chatSearch}>
          <span className={styles.visuallyHidden}>חיפוש בשיחות</span>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="חיפוש…"
            dir="rtl"
            aria-controls="chat-thread-list"
          />
        </label>
      ) : null}

      {listLoading ? <p className={`${styles.muted} ${styles.listStatusPad}`}>טוען שיחות…</p> : null}
      {listError ? <p className={`${styles.listError} ${styles.listStatusPad}`}>{listError}</p> : null}
      {deleteError ? <p className={`${styles.listError} ${styles.listStatusPad}`}>{deleteError}</p> : null}

      {!listLoading && !listError && inboxRows.length === 0 ? (
        <div className={styles.emptyChatWrap} aria-hidden>
          <div className={styles.emptyChatArt} />
        </div>
      ) : null}

      <div className={styles.listScroll} role="region" aria-label="רשימת שיחות">
        {filteredRows.length > 0 ? (
          <ul id="chat-thread-list" className={styles.list}>
            {filteredRows.map((row) => {
              if (row.kind === "chat") {
                const thread = row.chat;
                const active = activeRouteMatches(activeThreadId, thread.id, "chat");
                const unread = thread.unreadForViewer ?? 0;
                const timeLabel = thread.lastMessageAt ? formatChatMessageTime(thread.lastMessageAt) : "";
                const preview = thread.lastMessagePreview;
                const mine = thread.lastMessageSenderId === user.uid;
                const title = thread.listingTitle || "שיחה";

                return (
                  <li key={`chat-${thread.id}`}>
                    <div
                      className={`${styles.threadCard} ${active ? styles.threadCardActive : ""} ${unread > 0 ? styles.threadCardUnread : ""}`}
                    >
                      <Link
                        href={`/chat/${thread.id}`}
                        className={styles.threadCardNav}
                        aria-current={active ? "page" : undefined}
                      >
                        <div className={styles.threadCardRow}>
                          <div className={styles.threadCardMain}>
                            <div className={styles.threadTitleRow}>
                              {unread > 0 ? <span className={styles.threadUnreadDot} aria-hidden /> : null}
                              <strong>{title}</strong>
                            </div>
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
                      <ThreadCardMenu
                        ariaLabel={`אפשרויות שיחה: ${title}`}
                        deleteLabel={DELETE_CHAT_THREAD_CONFIRM.confirmLabel}
                        onDeleteClick={() =>
                          setPendingDelete({ kind: "chat", id: thread.id, title })
                        }
                      />
                    </div>
                  </li>
                );
              }

              const inquiry = row.support;
              const active = activeRouteMatches(activeThreadId, inquiry.id, "support");
              const unread = inquiry.unreadForUser ?? 0;
              const timeLabel = inquiry.updatedAt ? formatChatMessageTime(inquiry.updatedAt) : "";
              const routeId = buildSupportChatRouteId(inquiry.id);
              const title = inquiry.subject || "תמיכה";

              return (
                <li key={`support-${inquiry.id}`}>
                  <div
                    className={`${styles.threadCard} ${active ? styles.threadCardActive : ""} ${unread > 0 ? styles.threadCardUnread : ""}`}
                  >
                    <Link href={`/chat/${routeId}`} className={styles.threadCardNav} aria-current={active ? "page" : undefined}>
                      <div className={styles.threadCardRow}>
                        <div className={styles.threadCardMain}>
                          <div className={styles.threadTitleRow}>
                            {unread > 0 ? <span className={styles.threadUnreadDot} aria-hidden /> : null}
                            <strong>{title}</strong>
                          </div>
                          {inquiry.lastMessagePreview ? (
                            <p className={styles.threadPreview}>{inquiry.lastMessagePreview}</p>
                          ) : null}
                          <span className={styles.threadListingMeta}>
                            תמיכה · #{formatSupportInquiryReference(inquiry.referenceNumber)} ·{" "}
                            {SUPPORT_INQUIRY_STATUS_LABELS[inquiry.status]}
                          </span>
                        </div>
                        <div className={styles.threadCardAside}>
                          {timeLabel ? <span className={styles.threadTime}>{timeLabel}</span> : null}
                          {unread > 0 && supportInquiryIsOpen(inquiry.status) ? (
                            <span className={styles.unreadBadge} aria-label={`${unread} הודעות חדשות`}>
                              {unread > 99 ? "99+" : unread}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </Link>
                    <ThreadCardMenu
                      ariaLabel={`אפשרויות פנייה: ${title}`}
                      deleteLabel={DELETE_SUPPORT_INQUIRY_CONFIRM.confirmLabel}
                      onDeleteClick={() =>
                        setPendingDelete({ kind: "support", id: inquiry.id, title })
                      }
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        ) : inboxRows.length > 0 && searchQuery.trim() ? (
          <p className={`${styles.muted} ${styles.listStatusPad}`}>אין תוצאות לחיפוש.</p>
        ) : null}
      </div>

      <LobbyConfirmDialog
        open={pendingDelete !== null}
        title={confirmCopy.title}
        body={confirmCopy.body}
        confirmLabel={confirmCopy.confirmLabel}
        variant="destructive"
        busy={deleting}
        onCancel={() => {
          if (!deleting) {
            setPendingDelete(null);
          }
        }}
        onConfirm={() => void handleConfirmDelete()}
      />
    </div>
  );
}
