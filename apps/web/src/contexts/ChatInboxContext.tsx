"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useLobbyAuth } from "@/contexts/LobbyAuthContext";
import { useDeferredReady } from "@/lib/useDeferredEffect";
import { formatChatThreadsListError, subscribeChatThreadsForUser, type ChatThreadSummary } from "@/lib/firebase/chat";
import { getFirestoreDb, ensureFirestoreAuthReady } from "@/lib/firebase/client";
import { isFirebaseConfigured } from "@/lib/firebase/isConfigured";
import { subscribeMySupportInquiries, type SupportInquirySummary } from "@/lib/firebase/supportInquiryThread";
import { mergeMessagesInboxRows, messagesInboxUnreadTotal, type MessagesInboxRow } from "@/lib/messagesInbox";

interface ChatInboxContextValue {
  threads: ChatThreadSummary[];
  supportInquiries: SupportInquirySummary[];
  inboxRows: MessagesInboxRow[];
  totalUnread: number;
  listLoading: boolean;
  listError: string | null;
}

const ChatInboxContext = createContext<ChatInboxContextValue | null>(null);

function routeNeedsChatInbox(pathname: string): boolean {
  return pathname.startsWith("/chat") || pathname.startsWith("/support");
}

export function ChatInboxProvider({ children }: { children: ReactNode }) {
  const { user } = useLobbyAuth();
  const pathname = usePathname();
  const subscribeReady = useDeferredReady(routeNeedsChatInbox(pathname));
  const [threads, setThreads] = useState<ChatThreadSummary[]>([]);
  const [supportInquiries, setSupportInquiries] = useState<SupportInquirySummary[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  const inboxRows = useMemo(
    () => mergeMessagesInboxRows(threads, supportInquiries),
    [threads, supportInquiries],
  );

  const totalUnread = useMemo(
    () => messagesInboxUnreadTotal(threads, supportInquiries),
    [threads, supportInquiries],
  );

  useEffect(() => {
    if (!isFirebaseConfigured() || !user || !subscribeReady) {
      if (!user) {
        setThreads([]);
        setSupportInquiries([]);
        setListLoading(false);
        setListError(null);
      }
      return;
    }

    const db = getFirestoreDb();
    let cancelled = false;
    let unsubscribeChat: (() => void) | undefined;
    let unsubscribeSupport: (() => void) | undefined;

    void (async () => {
      try {
        await ensureFirestoreAuthReady(user);
      } catch {
        /* ignore */
      }

      if (cancelled) {
        return;
      }

      setListLoading(true);
      setListError(null);

      unsubscribeSupport = subscribeMySupportInquiries(
        db,
        user.uid,
        (rows) => {
          if (!cancelled) {
            setSupportInquiries(rows);
            setListLoading(false);
          }
        },
        () => {
          if (!cancelled) {
            setSupportInquiries([]);
          }
        },
      );

      unsubscribeChat = subscribeChatThreadsForUser(
        db,
        user.uid,
        (rows) => {
          if (!cancelled) {
            setThreads(rows);
            setListLoading(false);
            setListError(null);
          }
        },
        (err) => {
          if (!cancelled) {
            setListError(formatChatThreadsListError(err));
            setListLoading(false);
          }
        },
      );
    })();

    return () => {
      cancelled = true;
      unsubscribeChat?.();
      unsubscribeSupport?.();
    };
  }, [user, subscribeReady]);

  const value = useMemo<ChatInboxContextValue>(
    () => ({
      threads,
      supportInquiries,
      inboxRows,
      totalUnread,
      listLoading,
      listError,
    }),
    [threads, supportInquiries, inboxRows, totalUnread, listLoading, listError],
  );

  return <ChatInboxContext.Provider value={value}>{children}</ChatInboxContext.Provider>;
}

export function useChatInbox(): ChatInboxContextValue {
  const ctx = useContext(ChatInboxContext);
  if (!ctx) {
    throw new Error("useChatInbox must be used within ChatInboxProvider");
  }
  return ctx;
}

export function useChatInboxOptional(): ChatInboxContextValue | null {
  return useContext(ChatInboxContext);
}
