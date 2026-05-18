"use client";

import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { isMessagingNotificationKind, type LobbyInAppNotification } from "@lobby/shared";
import { useLobbyAuth } from "@/contexts/LobbyAuthContext";
import { useDeferredReady } from "@/lib/useDeferredEffect";
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
  const pathname = usePathname();
  const subscribeReady = useDeferredReady(pathname.startsWith("/account/notifications"));
  const [items, setItems] = useState<LobbyInAppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    if (!user || !isFirebaseConfigured() || !subscribeReady) {
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

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [user, subscribeReady]);

  const visibleItems = useMemo(
    () => items.filter((n) => !isMessagingNotificationKind(n.kind)),
    [items],
  );

  const unreadCount = useMemo(() => visibleItems.filter((n) => !n.read).length, [visibleItems]);

  const value = useMemo(
    () => ({ items: visibleItems, loading, unreadCount }),
    [visibleItems, loading, unreadCount],
  );

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
