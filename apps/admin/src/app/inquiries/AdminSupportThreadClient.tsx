"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  SUPPORT_INQUIRY_MESSAGE_MAX,
  SUPPORT_INQUIRY_STATUS_LABELS,
  createOptimisticMessageId,
  formatLobbySendError,
  logLobbyError,
  formatChatMessageTime,
  formatSupportInquiryReference,
  isComposerSendKey,
  staffCanPerformAction,
  supportInquiryCanStaffReopen,
  supportInquiryIsOpen,
  type SupportInquiryRecord,
} from "@lobby/shared";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import {
  claimAdminSupportInquiry,
  closeAdminSupportInquiry,
  reopenAdminSupportInquiry,
  sendAdminSupportInquiryMessage,
} from "@/lib/firebase/functions";
import { getFunctions, httpsCallable } from "firebase/functions";
import { getFirebaseApp } from "@/lib/firebase/client";
import { ensureAdminFirestoreAuthReady, getFirestoreDb } from "@/lib/firebase/client";
import {
  subscribeAdminSupportInquiry,
  subscribeAdminSupportMessages,
  type AdminSupportMessageRow,
} from "@/lib/firebase/supportInquiryThread";
import { mergeServerMessagesWithPending, pruneAcknowledgedPending } from "@/lib/mergePendingMessages";
import { SupportInquiryIntroCard } from "./SupportInquiryIntroCard";
import styles from "./inquiriesChat.module.css";

export function AdminSupportThreadClient({ inquiryId }: { inquiryId: string }) {
  const { staffRole, user } = useAdminAuth();
  const canAct = staffRole ? staffCanPerformAction(staffRole, "inquiries.resolve") : false;

  const [inquiry, setInquiry] = useState<SupportInquiryRecord | null | undefined>(undefined);
  const [messages, setMessages] = useState<AdminSupportMessageRow[]>([]);
  const [pendingMessages, setPendingMessages] = useState<AdminSupportMessageRow[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [closing, setClosing] = useState(false);
  const [reopening, setReopening] = useState(false);
  const [assignNotice, setAssignNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messagesScrollRef = useRef<HTMLDivElement | null>(null);

  const isOpen = inquiry ? supportInquiryIsOpen(inquiry.status) : false;
  const canReopen = inquiry ? supportInquiryCanStaffReopen(inquiry) : false;

  useEffect(() => {
    if (!user) {
      return;
    }

    let unsubInquiry: (() => void) | undefined;
    let unsubMessages: (() => void) | undefined;
    let cancelled = false;

    void (async () => {
      try {
        await ensureAdminFirestoreAuthReady(user);
      } catch {
        /* ignore */
      }
      if (cancelled) {
        return;
      }

      const db = getFirestoreDb();
      unsubInquiry = subscribeAdminSupportInquiry(db, inquiryId, setInquiry);
      unsubMessages = subscribeAdminSupportMessages(db, inquiryId, (rows) => {
        setMessages(rows);
        setPendingMessages((pending) => pruneAcknowledgedPending(pending, rows));
      });

      if (!canAct) {
        return;
      }
      const markRead = httpsCallable<{ inquiryId: string }, { ok: boolean }>(
        getFunctions(getFirebaseApp(), "us-central1"),
        "lobbyMarkSupportInquiryRead",
      );
      void markRead({ inquiryId }).catch(() => {});

      void claimAdminSupportInquiry(inquiryId).then((result) => {
        if (result.alreadyAssigned && result.inquiry.assignedToUid && result.inquiry.assignedToUid !== user.uid) {
          setAssignNotice(`משויך ל־${result.inquiry.assignedToDisplayName || "נציג אחר"}`);
        } else {
          setAssignNotice(null);
        }
        setInquiry(result.inquiry);
      });
    })();

    return () => {
      cancelled = true;
      unsubInquiry?.();
      unsubMessages?.();
    };
  }, [inquiryId, canAct, user]);

  const displayMessages = useMemo(
    () => mergeServerMessagesWithPending(messages, pendingMessages),
    [messages, pendingMessages],
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [displayMessages, inquiry]);

  async function handleSend() {
    const text = draft.trim();
    if (!text || !canAct || !isOpen || !user || sending) {
      return;
    }

    const optimisticId = createOptimisticMessageId();
    const optimistic: AdminSupportMessageRow = {
      id: optimisticId,
      senderId: user.uid,
      senderRole: "staff",
      text,
      createdAt: Date.now(),
    };

    setDraft("");
    setPendingMessages((prev) => [...prev, optimistic]);
    setError(null);
    setSending(true);

    try {
      await ensureAdminFirestoreAuthReady(user);
      await sendAdminSupportInquiryMessage(inquiryId, text);
    } catch (err) {
      logLobbyError("admin support send", err);
      setPendingMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      setDraft(text);
      setError(formatLobbySendError(err, "לא ניתן לשלוח."));
    } finally {
      setSending(false);
    }
  }

  async function handleClose() {
    if (!canAct || !isOpen || closing) {
      return;
    }
    setClosing(true);
    setError(null);
    try {
      const updated = await closeAdminSupportInquiry(inquiryId);
      setInquiry(updated);
    } catch {
      setError("לא ניתן לסגור.");
    } finally {
      setClosing(false);
    }
  }

  async function handleReopen() {
    if (!canAct || !canReopen || reopening) {
      return;
    }
    setReopening(true);
    setError(null);
    try {
      const updated = await reopenAdminSupportInquiry(inquiryId);
      setInquiry(updated);
    } catch {
      setError("לא ניתן לפתוח מחדש.");
    } finally {
      setReopening(false);
    }
  }

  if (inquiry === undefined) {
    return <p className={styles.muted}>טוען שיחה…</p>;
  }

  if (inquiry === null) {
    return (
      <p className={styles.muted}>
        פנייה לא נמצאה. <Link href="/inquiries">חזרה לרשימה</Link>
      </p>
    );
  }

  return (
    <div className={styles.threadShell}>
      <div className={styles.threadToolbar}>
        <div>
          <Link href="/inquiries" className={styles.btn}>
            ← רשימה
          </Link>
          <h1 style={{ marginTop: 8 }}>
            {inquiry.subject} · #{formatSupportInquiryReference(inquiry.referenceNumber)}
          </h1>
          <p className={styles.threadMeta} style={{ margin: "4px 0 0" }}>
            {SUPPORT_INQUIRY_STATUS_LABELS[inquiry.status]}
            {inquiry.assignedToDisplayName ? ` · ${inquiry.assignedToDisplayName}` : ""}
          </p>
        </div>
        <div className={styles.toolbarActions}>
          {canAct && isOpen ? (
            <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} disabled={closing} onClick={() => void handleClose()}>
              {closing ? "סוגר…" : "סגירת פנייה"}
            </button>
          ) : null}
          {canAct && canReopen ? (
            <button type="button" className={styles.btn} disabled={reopening} onClick={() => void handleReopen()}>
              {reopening ? "פותח…" : "פתיחה מחדש"}
            </button>
          ) : null}
        </div>
      </div>

      {assignNotice ? <p className={styles.assignedBanner}>{assignNotice}</p> : null}

      <div ref={messagesScrollRef} className={styles.messagesScroll}>
        <div className={styles.messagesInner}>
          <SupportInquiryIntroCard inquiry={inquiry} />
          {displayMessages.map((message) => {
            const staff = message.senderRole === "staff";
            const timeLabel = formatChatMessageTime(message.createdAt);
            return (
              <div
                key={message.id}
                className={`${styles.bubbleWrap} ${staff ? styles.bubbleWrapMine : styles.bubbleWrapOther}`}
              >
                <div className={`${styles.bubble} ${staff ? styles.bubbleMine : styles.bubbleOther}`}>
                  {message.text}
                </div>
                {timeLabel ? <span className={styles.bubbleTime}>{staff ? "צוות" : "לקוח"} · {timeLabel}</span> : null}
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {error ? <p className={styles.sendError}>{error}</p> : null}

      {canAct && isOpen ? (
        <div className={styles.composerSticky}>
          <div className={styles.composer}>
            <textarea
              value={draft}
              maxLength={SUPPORT_INQUIRY_MESSAGE_MAX}
              placeholder="תשובה ללקוח…"
              rows={2}
              dir="rtl"
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.nativeEvent.isComposing) {
                  return;
                }
                if (isComposerSendKey(e.key, e.shiftKey)) {
                  e.preventDefault();
                  void handleSend();
                }
              }}
            />
            <button
              type="button"
              className={`${styles.btn} ${styles.btnPrimary}`}
              disabled={sending || !draft.trim()}
              onClick={() => void handleSend()}
            >
              {sending ? "…" : "שליחה"}
            </button>
          </div>
        </div>
      ) : (
        <p className={styles.muted}>{isOpen ? "" : "הפנייה סגורה."}</p>
      )}
    </div>
  );
}
