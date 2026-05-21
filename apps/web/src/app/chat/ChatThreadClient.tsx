"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  CHAT_MESSAGE_MAX_LENGTH,
  createOptimisticMessageId,
  formatChatMessageTime,
  formatLobbySendError,
  logLobbyError,
} from "@lobby/shared";
import {
  ChatComposer,
  ChatGate,
  ChatMessageArea,
  ChatMessageBubble,
  ChatPanelShell,
  ChatThreadHeader,
} from "@/components/messaging/chat-ui";
import { Button } from "@/components/ui/button";
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
import { scrollThreadToBottom } from "@/lib/messaging/scrollThreadToBottom";

interface ChatThreadClientProps {
  threadId: string;
}

const CHAT_LEGAL_NOTICE =
  "השיחות לתיאום סביב המודעה בלבד. Lobby אינה צד לעסקה, אינה מנטרת הודעות בזמן אמת ואינה אחראית לתוכן שמועבר בין משתמשים. אל תעבירו מידע רגיש או כספים ללא וידוא זהות.";

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
      scrollThreadToBottom(el, messagesEndRef.current, "smooth");
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

  if (thread === undefined && user && isFirebaseConfigured()) {
    return (
      <ChatPanelShell className="items-center justify-center" role="region" aria-label="שיחה">
        <p className="text-muted-foreground text-sm">טוען שיחה…</p>
      </ChatPanelShell>
    );
  }

  if (thread === null && user && isFirebaseConfigured()) {
    return (
      <ChatPanelShell className="items-center justify-center gap-3 p-8 text-center" role="region" aria-label="שיחה">
        <p className="text-sm">אין גישה לשיחה הזאת.</p>
        <Button variant="outline" asChild>
          <Link href="/chat">חזרה להודעות</Link>
        </Button>
      </ChatPanelShell>
    );
  }

  return (
    <ChatGate
      firebaseMissing={!isFirebaseConfigured()}
      loading={loading}
      needsAuth={!user}
      onAuth={openAuthModal}
      message="התחברו כדי לצפות בשיחה."
    >
      {thread ? (
        <ChatPanelShell role="region" aria-label="שיחה">
          <ChatThreadHeader
            backHref="/chat"
            title={thread.listingTitle || "שיחה"}
            subtitle="צ׳אט סביב המודעה"
          />

          <ChatMessageArea scrollRef={messagesScrollRef}>
            {displayMessages.map((message) => {
              const mine = message.senderId === user?.uid;
              const timeLabel = formatChatMessageTime(message.createdAt);
              return (
                <ChatMessageBubble key={message.id} mine={Boolean(mine)} timeLabel={timeLabel || undefined}>
                  {message.text}
                </ChatMessageBubble>
              );
            })}
            <div ref={messagesEndRef} />
          </ChatMessageArea>

          <ChatComposer
            value={draft}
            onChange={setDraft}
            onSend={() => void handleSend()}
            sending={sending}
            maxLength={CHAT_MESSAGE_MAX_LENGTH}
            error={sendError}
            notice={CHAT_LEGAL_NOTICE}
          />
        </ChatPanelShell>
      ) : null}
    </ChatGate>
  );
}
