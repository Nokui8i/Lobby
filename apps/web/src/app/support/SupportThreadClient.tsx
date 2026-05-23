"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  SUPPORT_INQUIRY_MESSAGE_MAX,
  createOptimisticMessageId,
  formatChatMessageTime,
  formatLobbySendError,
  accountMessagesIndexPath,
  logLobbyError,
  supportInquiryIsOpen,
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
import { scrollThreadToBottom } from "@/lib/messaging/scrollThreadToBottom";

interface SupportThreadClientProps {
  inquiryId: string;
}

export function SupportThreadClient({ inquiryId }: SupportThreadClientProps) {
  const { user, loading, openAuthModal, displayNameForUi } = useLobbyAuth();
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
      scrollThreadToBottom(el, messagesEndRef.current, "smooth");
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

  if (inquiry === undefined && user && isFirebaseConfigured()) {
    return (
      <ChatPanelShell className="items-center justify-center" role="region" aria-label="פנייה">
        <p className="text-muted-foreground text-sm">טוען פנייה…</p>
      </ChatPanelShell>
    );
  }

  if (inquiry === null && user && isFirebaseConfigured()) {
    return (
      <ChatPanelShell className="items-center justify-center gap-3 p-8 text-center" role="region" aria-label="פנייה">
        <p className="text-sm">אין גישה לפנייה הזאת.</p>
        <Button variant="outline" asChild>
          <Link href={accountMessagesIndexPath()}>חזרה להודעות</Link>
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
      message="התחברו כדי לצפות בפנייה."
    >
      {inquiry ? (
        <ChatPanelShell role="region" aria-label="פנייה לתמיכה">
          <ChatThreadHeader
            backHref={accountMessagesIndexPath()}
            title={inquiry.subject || "תמיכה"}
            subtitle="פנייה לצוות Lobby"
            actions={
              isOpen && !inquiry.userResolvedAt ? (
                <Button variant="outline" size="sm" disabled={closing} onClick={() => void handleMarkResolved()}>
                  {closing ? "שומר…" : "הבעיה נפתרה"}
                </Button>
              ) : null
            }
          />

          <ChatMessageArea scrollRef={messagesScrollRef}>
            <SupportInquirySystemMessages inquiry={inquiry} />
            {displayMessages.map((message) => {
              const mine = message.senderRole === "user";
              const timeLabel = formatChatMessageTime(message.createdAt);
              const senderName = mine ? displayNameForUi.trim() || "אתם" : "תמיכת Lobby";
              return (
                <ChatMessageBubble
                  key={message.id}
                  mine={mine}
                  senderName={senderName}
                  timeLabel={timeLabel || undefined}
                >
                  {message.text}
                </ChatMessageBubble>
              );
            })}
            <div ref={messagesEndRef} />
          </ChatMessageArea>

          {isOpen ? (
            <ChatComposer
              value={draft}
              onChange={setDraft}
              onSend={() => void handleSend()}
              sending={sending}
              maxLength={SUPPORT_INQUIRY_MESSAGE_MAX}
              error={sendError}
            />
          ) : (
            <footer className="border-border bg-card text-muted-foreground shrink-0 border-t p-4 text-center text-sm">
              הפנייה סגורה.{" "}
              <Link href="/contact" className="text-primary font-medium hover:underline">
                פנייה חדשה
              </Link>
            </footer>
          )}
        </ChatPanelShell>
      ) : null}
    </ChatGate>
  );
}
