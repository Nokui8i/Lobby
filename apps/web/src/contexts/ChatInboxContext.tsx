"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  isAccountMessagesPath,
  parseAccountMessagesThreadId,
  parseLegacyChatThreadId,
  parseSupportChatRouteId,
} from "@lobby/shared";
import { useLobbyAuth } from "@/contexts/LobbyAuthContext";
import { useDeferredReady } from "@/lib/useDeferredEffect";
import {
  formatChatThreadsListError,
  markChatThreadRead,
  subscribeChatThreadsForUser,
  type ChatThreadSummary,
} from "@/lib/firebase/chat";
import { DEMO_CHAT_THREAD_ID, isChatDemoEnabled, isChatDemoThreadId, mergeChatThreadsWithDemo } from "@/lib/chatDemo";
import { getFirestoreDb, ensureFirestoreAuthReady } from "@/lib/firebase/client";
import { isFirebaseConfigured } from "@/lib/firebase/isConfigured";
import { markSupportInquiryRead } from "@/lib/firebase/supportInquiry";
import { subscribeMySupportInquiries, type SupportInquirySummary } from "@/lib/firebase/supportInquiryThread";
import { mergeMessagesInboxRows, messagesInboxUnreadTotal, type MessagesInboxRow } from "@/lib/messagesInbox";

const DEMO_CHAT_READ_SESSION_KEY = "lobby-demo-chat-read";

function activeChatRouteId(pathname: string): string | null {
  return parseAccountMessagesThreadId(pathname) ?? parseLegacyChatThreadId(pathname);
}

function applyOpenThreadReadOverrides(
  threads: ChatThreadSummary[],
  support: SupportInquirySummary[],
  activeRouteId: string | null,
  demoReadInSession: boolean,
): { threads: ChatThreadSummary[]; support: SupportInquirySummary[] } {
  if (!activeRouteId && !demoReadInSession) {
    return { threads, support };
  }

  const supportInquiryId = activeRouteId ? parseSupportChatRouteId(activeRouteId) : null;

  const nextSupport =
    supportInquiryId != null
      ? support.map((row) => (row.id === supportInquiryId ? { ...row, unreadForUser: 0 } : row))
      : support;

  const nextThreads = threads.map((row) => {
    const openNow = activeRouteId != null && row.id === activeRouteId;
    const demoRead =
      row.id === DEMO_CHAT_THREAD_ID && (openNow || demoReadInSession);
    if (openNow || demoRead) {
      return { ...row, unreadForViewer: 0 };
    }
    return row;
  });

  return { threads: nextThreads, support: nextSupport };
}

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
  return isAccountMessagesPath(pathname) || pathname.startsWith("/chat") || pathname.startsWith("/support");
}

export function ChatInboxProvider({ children }: { children: ReactNode }) {
  const { user } = useLobbyAuth();
  const pathname = usePathname() || "";
  const activeRouteId = activeChatRouteId(pathname);
  const subscribeReady = useDeferredReady(routeNeedsChatInbox(pathname));
  const [threads, setThreads] = useState<ChatThreadSummary[]>([]);
  const [supportInquiries, setSupportInquiries] = useState<SupportInquirySummary[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [demoReadInSession, setDemoReadInSession] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    setDemoReadInSession(sessionStorage.getItem(DEMO_CHAT_READ_SESSION_KEY) === "1");
  }, []);

  useEffect(() => {
    if (!activeRouteId || !isChatDemoThreadId(activeRouteId)) {
      return;
    }
    setDemoReadInSession(true);
    if (typeof window !== "undefined") {
      sessionStorage.setItem(DEMO_CHAT_READ_SESSION_KEY, "1");
    }
  }, [activeRouteId]);

  const { threads: displayThreads, support: displaySupport } = useMemo(
    () => applyOpenThreadReadOverrides(threads, supportInquiries, activeRouteId, demoReadInSession),
    [threads, supportInquiries, activeRouteId, demoReadInSession],
  );

  const inboxRows = useMemo(
    () => mergeMessagesInboxRows(displayThreads, displaySupport),
    [displayThreads, displaySupport],
  );

  const totalUnread = useMemo(
    () => messagesInboxUnreadTotal(displayThreads, displaySupport),
    [displayThreads, displaySupport],
  );

  useEffect(() => {
    if (!user || !activeRouteId || !isFirebaseConfigured()) {
      return;
    }

    const supportInquiryId = parseSupportChatRouteId(activeRouteId);
    if (supportInquiryId) {
      void markSupportInquiryRead(supportInquiryId).catch(() => {});
      return;
    }

    if (isChatDemoThreadId(activeRouteId)) {
      return;
    }

    void (async () => {
      try {
        await ensureFirestoreAuthReady(user);
        await markChatThreadRead(getFirestoreDb(), activeRouteId, user.uid);
      } catch {
        /* ignore */
      }
    })();
  }, [user, activeRouteId]);

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
            setThreads(mergeChatThreadsWithDemo(rows, user.uid));
            setListLoading(false);
            setListError(null);
          }
        },
        (err) => {
          if (!cancelled) {
            const fallback = mergeChatThreadsWithDemo([], user.uid);
            setThreads(fallback);
            setListError(fallback.length > 0 ? null : formatChatThreadsListError(err));
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
      threads: displayThreads,
      supportInquiries: displaySupport,
      inboxRows,
      totalUnread,
      listLoading,
      listError,
    }),
    [displayThreads, displaySupport, inboxRows, totalUnread, listLoading, listError],
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
