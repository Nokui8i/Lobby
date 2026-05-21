"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import {
  formatChatMessageTime,
  formatNotificationBodyForDisplay,
  resolveLobbyNotificationNavigation,
  type LobbyInAppNotification,
} from "@lobby/shared";
import { PageMain } from "@/components/layout/PageMain";
import { bubble } from "@/components/bubble/styles";
import { useLobbyAuth } from "@/contexts/LobbyAuthContext";
import { useLobbyNotifications } from "@/contexts/LobbyNotificationsContext";
import { isFirebaseConfigured } from "@/lib/firebase/isConfigured";
import { markAllNotificationsRead, markNotificationRead } from "@/lib/firebase/notifications";
import { cn } from "@/lib/utils";

function openTarget(router: ReturnType<typeof useRouter>, item: LobbyInAppNotification) {
  const nav = resolveLobbyNotificationNavigation(item);
  if (!nav) {
    return;
  }
  if (nav.type === "chat") {
    router.push(`/chat/${nav.threadId}`);
    return;
  }
  if (nav.type === "account") {
    router.push("/account?tab=draft");
    return;
  }
  if (nav.type === "publish") {
    router.push(`/publish?listingId=${nav.listingId}`);
    return;
  }
  if (nav.type === "contact") {
    router.push("/contact");
    return;
  }
  if (nav.type === "listing") {
    router.push(`/listings/${nav.listingId}`);
  }
}

export function NotificationsClient() {
  const router = useRouter();
  const { user, loading: authLoading, openAuthModal } = useLobbyAuth();
  const { items, loading, unreadCount } = useLobbyNotifications();
  const [markingAll, setMarkingAll] = useState(false);

  const unreadIds = useMemo(() => items.filter((n) => !n.read).map((n) => n.id), [items]);

  const handleOpen = useCallback(
    (item: LobbyInAppNotification) => {
      if (!item.read) {
        void markNotificationRead(item.id);
      }
      openTarget(router, item);
    },
    [router],
  );

  const handleMarkAll = useCallback(async () => {
    if (unreadIds.length === 0 || markingAll) {
      return;
    }
    setMarkingAll(true);
    try {
      await markAllNotificationsRead(unreadIds);
    } finally {
      setMarkingAll(false);
    }
  }, [markingAll, unreadIds]);

  if (!isFirebaseConfigured()) {
    return (
      <PageMain>
        <p className="py-7 text-right text-[15px] font-bold text-[#a3aed0]">אין חיבור לשרת.</p>
      </PageMain>
    );
  }

  if (authLoading) {
    return (
      <PageMain>
        <p className="py-7 text-right text-[15px] font-bold text-[#a3aed0]">טוען…</p>
      </PageMain>
    );
  }

  if (!user) {
    return (
      <PageMain>
        <Link href="/account" className="mb-2 inline-block text-sm font-extrabold text-brand no-underline">
          חזרה
        </Link>
        <p className="py-7 text-right text-[15px] font-bold text-[#a3aed0]">
          <button type="button" onClick={openAuthModal} className="border-0 bg-transparent font-[inherit] font-extrabold">
            כניסה
          </button>
        </p>
      </PageMain>
    );
  }

  return (
    <PageMain>
      <div className="mx-auto w-full max-w-3xl">
      <Link href="/account" className="mb-2 inline-block text-sm font-extrabold text-brand no-underline">
        חזרה
      </Link>
      <div className="my-5 flex flex-row-reverse items-center justify-between gap-3">
        <h1 className={cn("text-3xl font-bold tracking-tight", bubble.heading)}>התראות</h1>
        {unreadCount > 0 ? (
          <button
            type="button"
            className="shrink-0 cursor-pointer whitespace-nowrap rounded-full border border-brand/40 bg-[#E8F4F8] px-4 py-2.5 text-sm font-extrabold text-brand disabled:cursor-wait disabled:opacity-65"
            disabled={markingAll}
            onClick={() => void handleMarkAll()}
          >
            {markingAll ? "מסמן…" : "סמן הכל כנקרא"}
          </button>
        ) : null}
      </div>
      {loading && items.length === 0 ? (
        <p className="py-7 text-right text-[15px] font-bold text-[#a3aed0]">טוען…</p>
      ) : null}
      {!loading && items.length === 0 ? (
        <p className="py-7 text-right text-[15px] font-bold text-[#a3aed0]">אין עדכונים.</p>
      ) : null}
      <div className="flex flex-col gap-2.5">
        {items.map((item) => {
          const timeLabel = formatChatMessageTime(item.createdAtMs);
          return (
            <button
              key={item.id}
              type="button"
              className={cn(
                bubble.card,
                "block w-full p-4 text-right text-inherit shadow-[0_10px_28px_rgba(16,24,32,0.05)] transition hover:-translate-y-px",
                !item.read && "border-brand/30 bg-[#E8F4F8]/45",
              )}
              onClick={() => handleOpen(item)}
            >
              <div className="text-[15px] font-extrabold leading-snug text-graphite">{item.title}</div>
              <div className="mt-1.5 text-sm font-semibold leading-snug whitespace-pre-line text-[#a3aed0]">
                {formatNotificationBodyForDisplay(item)}
              </div>
              {timeLabel ? <div className="mt-2 text-xs font-bold text-[#a3aed0]">{timeLabel}</div> : null}
            </button>
          );
        })}
      </div>
      </div>
    </PageMain>
  );
}
