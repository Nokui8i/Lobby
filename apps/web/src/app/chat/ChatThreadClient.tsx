"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  CHAT_MESSAGE_MAX_LENGTH,
  createOptimisticMessageId,
  formatChatMessageTime,
  formatLobbySendError,
  isComposerSendKey,
  logLobbyError,
} from "@lobby/shared";
import { useLobbyAuth } from "@/contexts/LobbyAuthContext";
import {
  getChatThreadIfParticipant,
  markChatThreadRead,
  sendChatMessage,
  subscribeChatMessages,
  type ChatMessageRow,
  type ChatThreadSummary,
} from "@/lib/firebase/chat";
import { getFirestoreDb, ensureFirestoreAuthReady } from "@/lib/firebase/client";
import { isFirebaseConfigured } from "@/lib/firebase/isConfigured";
import { mergeServerMessagesWithPending, pruneAcknowledgedPending } from "@/lib/mergePendingMessages";
import styles from "./chat.module.css";

interface ChatThreadClientProps {
  threadId: string;
}

export function ChatThreadClient({ threadId }: ChatThreadClientProps) {
  const { user, loading, openAuthModal } = useLobbyAuth();
  const [thread, setThread] = useState<ChatThreadSummary | null | undefined>(undefined);
  const [messages, setMessages] = useState<ChatMessageRow[]>([]);
  const [pendingMessages, setPendingMessages] = useState<ChatMessageRow[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messagesScrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isFirebaseConfigured() || !user) {
      setThread(null);
      setMessages([]);
      return;
    }

    setThread(undefined);
      setMessages([]);
      setPendingMessages([]);

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

      const summary = await getChatThreadIfParticipant(getFirestoreDb(), threadId, user.uid);

      if (cancelled) {
        return;
      }

      if (!summary) {
        setThread(null);
        return;
      }

      setThread(summary);
      void markChatThreadRead(getFirestoreDb(), threadId, user.uid).catch(() => {});

      unsubscribeMessages = subscribeChatMessages(getFirestoreDb(), threadId, (rows) => {
        setMessages(rows);
        setPendingMessages((pending) => pruneAcknowledgedPending(pending, rows));
      });
    })();

    return () => {
      cancelled = true;
      unsubscribeMessages?.();
    };
  }, [threadId, user]);

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

    if (nearBottom || last?.senderId === user?.uid) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [displayMessages, user?.uid]);

  async function handleSend() {
    if (!user || !thread || sending) {
      return;
    }

    const text = draft.trim();

    if (!text) {
      return;
    }

    const otherId = thread.participantIds.find((id) => id !== user.uid);
    if (!otherId) {
      return;
    }

    const optimisticId = createOptimisticMessageId();
    const optimistic: ChatMessageRow = {
      id: optimisticId,
      senderId: user.uid,
      text,
      createdAt: Date.now(),
    };

    setDraft("");
    setPendingMessages((prev) => [...prev, optimistic]);
    setSendError(null);
    setSending(true);

    try {
      await ensureFirestoreAuthReady(user);
      await sendChatMessage(getFirestoreDb(), threadId, user.uid, text, {
        otherParticipantId: otherId,
      });
    } catch (err) {
      logLobbyError("chat send", err);
      setPendingMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      setDraft(text);
      setSendError(formatLobbySendError(err, "לא ניתן לשלוח כרגע. בדקו חיבור ונסו שוב."));
    } finally {
      setSending(false);
    }
  }

  if (!isFirebaseConfigured()) {
    return (
      <div className={`${styles.threadShell} ${styles.threadShellSimple}`} role="region" aria-label="שיחה">
        <p className={styles.muted}>אין חיבור ל־Firebase.</p>
        <Link href="/chat" className={styles.backLink}>
          לרשימה
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={`${styles.threadShell} ${styles.threadShellSimple}`} role="region" aria-label="שיחה">
        <p className={styles.muted}>טוען…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className={`${styles.threadShell} ${styles.threadShellSimple}`} role="region" aria-label="שיחה">
        <div className={styles.threadToolbar}>
          <Link href="/chat" className={styles.backLink}>
            לרשימה
          </Link>
          <h1>שיחה</h1>
        </div>
        <p className={styles.threadShellSimpleText}>התחברו כדי לצפות בשיחה.</p>
        <button type="button" className={styles.ctaButton} onClick={openAuthModal}>
          כניסה
        </button>
      </div>
    );
  }

  if (thread === undefined) {
    return (
      <div className={`${styles.threadShell} ${styles.threadShellSimple}`} role="region" aria-label="שיחה">
        <p className={styles.muted}>טוען שיחה…</p>
      </div>
    );
  }

  if (thread === null) {
    return (
      <div className={`${styles.threadShell} ${styles.threadShellSimple}`} role="region" aria-label="שיחה">
        <p>אין גישה לשיחה הזאת.</p>
        <Link href="/chat" className={styles.backLink}>
          חזרה להודעות
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.threadShell} role="region" aria-label="שיחה">
      <div className={styles.threadToolbar}>
        <Link href="/chat" className={styles.backLink}>
          לרשימה
        </Link>
        <h1>צ׳אט</h1>
      </div>

      <p className={styles.threadMeta}>{thread.listingTitle}</p>

      <div ref={messagesScrollRef} className={styles.messagesScroll}>
        <div className={styles.messagesInner}>
          {displayMessages.map((message) => {
            const mine = message.senderId === user.uid;
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

      <div className={styles.composerSticky}>
        <p className={styles.chatLegalNotice}>
          השיחות לתיאום סביב המודעה בלבד. Lobby אינה צד לעסקה, אינה מנטרת הודעות בזמן אמת ואינה אחראית לתוכן
          שמועבר בין משתמשים. אל תעבירו מידע רגיש או כספים ללא וידוא זהות.
        </p>
        {sendError ? <p className={styles.sendError}>{sendError}</p> : null}
        <div className={styles.composer}>
          <textarea
            value={draft}
            maxLength={CHAT_MESSAGE_MAX_LENGTH}
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
    </div>
  );
}
