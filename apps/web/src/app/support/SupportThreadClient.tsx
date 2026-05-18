"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  SUPPORT_INQUIRY_MESSAGE_MAX,
  createOptimisticMessageId,
  formatChatMessageTime,
  formatLobbySendError,
  isComposerSendKey,
  logLobbyError,
  supportInquiryIsOpen,
} from "@lobby/shared";
import { useLobbyAuth } from "@/contexts/LobbyAuthContext";
import {
  markSupportInquiryRead,
  markSupportInquiryResolved,
  sendSupportInquiryMessage,
} from "@/lib/firebase/supportInquiry";
import { SupportInquirySystemMessages } from "./SupportInquirySystemMessages";
import {
  getSupportInquiryIfOwner,
  subscribeSupportInquiry,
  subscribeSupportInquiryMessages,
  type SupportInquiryMessageRow,
  type SupportInquirySummary,
} from "@/lib/firebase/supportInquiryThread";
import { getFirestoreDb, ensureFirestoreAuthReady } from "@/lib/firebase/client";
import { isFirebaseConfigured } from "@/lib/firebase/isConfigured";
import { mergeServerMessagesWithPending, pruneAcknowledgedPending } from "@/lib/mergePendingMessages";
import styles from "../chat/chat.module.css";

interface SupportThreadClientProps {
  inquiryId: string;
}

export function SupportThreadClient({ inquiryId }: SupportThreadClientProps) {
  const { user, loading, openAuthModal } = useLobbyAuth();
  const [inquiry, setInquiry] = useState<SupportInquirySummary | null | undefined>(undefined);
  const [messages, setMessages] = useState<SupportInquiryMessageRow[]>([]);
  const [pendingMessages, setPendingMessages] = useState<SupportInquiryMessageRow[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [closing, setClosing] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messagesScrollRef = useRef<HTMLDivElement | null>(null);

  const isOpen = inquiry ? supportInquiryIsOpen(inquiry.status) : false;

  useEffect(() => {
    if (!isFirebaseConfigured() || !user) {
      setInquiry(null);
      setMessages([]);
      setPendingMessages([]);
      return;
    }

    setInquiry(undefined);
    setMessages([]);

    let unsubscribeInquiry: (() => void) | undefined;
    let unsubscribeMessages: (() => void) | undefined;
    let cancelled = false;

    void (async () => {
      try {
        await ensureFirestoreAuthReady(user);
      } catch {
        /* ignore */
      }

      if (cancelled) {
        return;
      }

      const db = getFirestoreDb();
      const summary = await getSupportInquiryIfOwner(db, inquiryId, user.uid);

      if (cancelled) {
        return;
      }

      if (!summary) {
        setInquiry(null);
        return;
      }

      setInquiry(summary);
      void markSupportInquiryRead(inquiryId).catch(() => {});

      unsubscribeInquiry = subscribeSupportInquiry(db, inquiryId, (row) => {
        setInquiry(row);
        if (row) {
          void markSupportInquiryRead(inquiryId).catch(() => {});
        }
      });

      unsubscribeMessages = subscribeSupportInquiryMessages(db, inquiryId, (rows) => {
        setMessages(rows);
        setPendingMessages((pending) => pruneAcknowledgedPending(pending, rows));
      });
    })();

    return () => {
      cancelled = true;
      unsubscribeInquiry?.();
      unsubscribeMessages?.();
    };
  }, [inquiryId, user]);

  const displayMessages = useMemo(
    () => mergeServerMessagesWithPending(messages, pendingMessages),
    [messages, pendingMessages],
  );

  useEffect(() => {
    const el = messagesScrollRef.current;
    if (!el || displayMessages.length === 0) {
      return;
    }
    const last = displayMessages[displayMessages.length - 1];
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const nearBottom = distanceFromBottom < 160;
    if (nearBottom || last?.senderRole === "user") {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [displayMessages]);

  async function handleSend() {
    if (!user || !inquiry || !isOpen || sending) {
      return;
    }
    const text = draft.trim();
    if (!text) {
      return;
    }

    const optimisticId = createOptimisticMessageId();
    const optimistic: SupportInquiryMessageRow = {
      id: optimisticId,
      senderId: user.uid,
      senderRole: "user",
      text,
      createdAt: Date.now(),
    };

    setDraft("");
    setPendingMessages((prev) => [...prev, optimistic]);
    setSendError(null);
    setSending(true);

    try {
      await ensureFirestoreAuthReady(user);
      await sendSupportInquiryMessage(inquiryId, text);
    } catch (err) {
      logLobbyError("support send", err);
      setPendingMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      setDraft(text);
      setSendError(formatLobbySendError(err, "לא ניתן לשלוח כרגע. נסו שוב."));
    } finally {
      setSending(false);
    }
  }

  async function handleMarkResolved() {
    if (!user || !inquiry || !isOpen || closing) {
      return;
    }
    setClosing(true);
    setSendError(null);
    try {
      await markSupportInquiryResolved(inquiryId);
    } catch {
      setSendError("לא ניתן לעדכן כרגע.");
    } finally {
      setClosing(false);
    }
  }

  if (!isFirebaseConfigured()) {
    return (
      <div className={`${styles.threadShell} ${styles.threadShellSimple}`} role="region" aria-label="פנייה">
        <p className={styles.muted}>אין חיבור ל־Firebase.</p>
        <Link href="/chat" className={styles.backLink}>
          לרשימה
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={`${styles.threadShell} ${styles.threadShellSimple}`} role="region" aria-label="פנייה">
        <p className={styles.muted}>טוען…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className={`${styles.threadShell} ${styles.threadShellSimple}`} role="region" aria-label="פנייה">
        <p className={styles.threadShellSimpleText}>התחברו כדי לצפות בפנייה.</p>
        <button type="button" className={styles.ctaButton} onClick={openAuthModal}>
          כניסה
        </button>
      </div>
    );
  }

  if (inquiry === undefined) {
    return (
      <div className={`${styles.threadShell} ${styles.threadShellSimple}`} role="region" aria-label="פנייה">
        <p className={styles.muted}>טוען פנייה…</p>
      </div>
    );
  }

  if (inquiry === null) {
    return (
      <div className={`${styles.threadShell} ${styles.threadShellSimple}`} role="region" aria-label="פנייה">
        <p>אין גישה לפנייה הזאת.</p>
        <Link href="/chat" className={styles.backLink}>
          חזרה להודעות
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.threadShell} role="region" aria-label="פנייה לתמיכה">
      <div className={styles.threadToolbar}>
        <Link href="/chat" className={styles.backLink}>
          לרשימה
        </Link>
        <h1>תמיכה</h1>
        {isOpen && !inquiry.userResolvedAt ? (
          <button
            type="button"
            className={styles.backLink}
            disabled={closing}
            onClick={() => void handleMarkResolved()}
          >
            {closing ? "שומר…" : "הבעיה נפתרה"}
          </button>
        ) : null}
      </div>

      <div ref={messagesScrollRef} className={styles.messagesScroll}>
        <div className={styles.messagesInner}>
          <SupportInquirySystemMessages inquiry={inquiry} />
          {displayMessages.map((message) => {
            const mine = message.senderRole === "user";
            const timeLabel = formatChatMessageTime(message.createdAt);
            return (
              <div
                key={message.id}
                className={`${styles.bubbleWrap} ${mine ? styles.bubbleWrapMine : styles.bubbleWrapOther}`}
              >
                <div className={`${styles.bubble} ${mine ? styles.bubbleMine : styles.bubbleOther}`}>
                  {message.text}
                </div>
                {timeLabel ? <span className={styles.bubbleTime}>{timeLabel}</span> : null}
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {isOpen ? (
        <div className={styles.composerSticky}>
          {sendError ? <p className={styles.sendError}>{sendError}</p> : null}
          <div className={styles.composer}>
            <textarea
              value={draft}
              maxLength={SUPPORT_INQUIRY_MESSAGE_MAX}
              placeholder="כתבו הודעה…"
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.nativeEvent.isComposing) {
                  return;
                }
                if (isComposerSendKey(event.key, event.shiftKey)) {
                  event.preventDefault();
                  void handleSend();
                }
              }}
              rows={2}
              dir="rtl"
            />
            <button
              type="button"
              className={styles.send}
              disabled={sending || !draft.trim()}
              onClick={() => void handleSend()}
            >
              שליחה
            </button>
          </div>
        </div>
      ) : (
        <p className={`${styles.muted} ${styles.listStatusPad}`}>
          הפנייה סגורה.{" "}
          <Link href="/contact" className={styles.backLink}>
            פנייה חדשה
          </Link>
        </p>
      )}
    </div>
  );
}
