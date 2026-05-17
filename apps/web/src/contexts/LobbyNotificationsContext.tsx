"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { LobbyInAppNotification } from "@lobby/shared";
import { useLobbyAuth } from "@/contexts/LobbyAuthContext";
import { getFirestoreDb } from "@/lib/firebase/client";
import { isFirebaseConfigured } from "@/lib/firebase/isConfigured";
import { subscribeMyNotifications } from "@/lib/firebase/notifications";

type LobbyNotificationsContextValue = {
  items: LobbyInAppNotification[];
  loading: boolean;
  unreadCount: number;
};

const LobbyNotificationsContext = createContext<LobbyNotificationsContextValue | null>(null);

export function LobbyNotificationsProvider({ children }: { children: ReactNode }) {
  const { user } = useLobbyAuth();
  const [items, setItems] = useState<LobbyInAppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    const t = globalThis.setTimeout(() => {
      if (cancelled) {
        return;
      }
      if (!user || !isFirebaseConfigured()) {
        setItems([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      unsubscribe = subscribeMyNotifications(
        getFirestoreDb(),
        user.uid,
        (rows) => {
          if (!cancelled) {
            setItems(rows);
            setLoading(false);
          }
        },
        () => {
          if (!cancelled) {
            setLoading(false);
          }
        },
      );
    }, 0);

    return () => {
      cancelled = true;
      globalThis.clearTimeout(t);
      unsubscribe?.();
    };
  }, [user]);

  const unreadCount = useMemo(() => items.filter((n) => !n.read).length, [items]);

  const value = useMemo(() => ({ items, loading, unreadCount }), [items, loading, unreadCount]);

  return (
    <LobbyNotificationsContext.Provider value={value}>{children}</LobbyNotificationsContext.Provider>
  );
}

export function useLobbyNotifications() {
  const ctx = useContext(LobbyNotificationsContext);
  if (!ctx) {
    throw new Error("useLobbyNotifications must be used within LobbyNotificationsProvider");
  }
  return ctx;
}

export function useLobbyNotificationsOptional() {
  return useContext(LobbyNotificationsContext);
}
