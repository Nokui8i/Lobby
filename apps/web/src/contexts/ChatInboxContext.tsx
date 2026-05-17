"use client";

import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useLobbyAuth } from "@/contexts/LobbyAuthContext";
import {
  fetchChatThreadsForUser,
  formatChatThreadsListError,
  subscribeChatThreadsForUser,
  type ChatThreadSummary,
} from "@/lib/firebase/chat";
import { getFirestoreDb, ensureFirestoreAuthReady } from "@/lib/firebase/client";
import { isFirebaseConfigured } from "@/lib/firebase/isConfigured";

interface ChatInboxContextValue {
  threads: ChatThreadSummary[];
  totalUnread: number;
  listLoading: boolean;
  listError: string | null;
}

const ChatInboxContext = createContext<ChatInboxContextValue | null>(null);

export function ChatInboxProvider({ children }: { children: ReactNode }) {
  const { user } = useLobbyAuth();
  const [threads, setThreads] = useState<ChatThreadSummary[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  const totalUnread = useMemo(
    () => threads.reduce((acc, t) => acc + (t.unreadForViewer ?? 0), 0),
    [threads],
  );

  useEffect(() => {
    if (!isFirebaseConfigured() || !user) {
      setThreads([]);
      setListLoading(false);
      setListError(null);
      return;
    }

    const db = getFirestoreDb();
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

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

      void fetchChatThreadsForUser(db, user.uid)
        .then((rows) => {
          if (!cancelled) {
            setThreads(rows);
            setListLoading(false);
          }
        })
        .catch((err) => {
          if (!cancelled) {
            setListError(formatChatThreadsListError(err));
            setListLoading(false);
          }
        });

      unsubscribe = subscribeChatThreadsForUser(
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
      unsubscribe?.();
    };
  }, [user]);

  const value = useMemo<ChatInboxContextValue>(
    () => ({
      threads,
      totalUnread,
      listLoading,
      listError,
    }),
    [threads, totalUnread, listLoading, listError],
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
