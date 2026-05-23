"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { Trash2, X } from "lucide-react";
import {
  DELETE_ALL_NOTIFICATIONS_CONFIRM,
  DELETE_ONE_NOTIFICATION_CONFIRM,
  accountMessagesThreadPath,
  formatChatMessageTime,
  formatNotificationBodyForDisplay,
  resolveLobbyNotificationNavigation,
  type LobbyInAppNotification,
} from "@lobby/shared";
import { LobbyConfirmDialog } from "@/components/LobbyConfirmDialog";
import { AccountAreaShell } from "@/app/account/AccountAreaShell";
import { bubble } from "@/components/bubble/styles";
import { useLobbyAuth } from "@/contexts/LobbyAuthContext";
import { useLobbyNotifications } from "@/contexts/LobbyNotificationsContext";
import { isFirebaseConfigured } from "@/lib/firebase/isConfigured";
import {
  deleteAllMyNotifications,
  deleteMyNotification,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/firebase/notifications";
import { cn } from "@/lib/utils";

/** גובה פאנל — בערך 5–6 התראות, גלילה רק בתוך הקונטיינר */
const NOTIFICATIONS_PANEL_MAX_HEIGHT = "min(34rem, calc(100dvh - 11rem))";

function openTarget(router: ReturnType<typeof useRouter>, item: LobbyInAppNotification) {
  const nav = resolveLobbyNotificationNavigation(item);
  if (!nav) {
    return;
  }
  if (nav.type === "chat") {
    router.push(accountMessagesThreadPath(nav.threadId));
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

function NotificationsPanelToolbar({
  unreadCount,
  hasItems,
  markingAll,
  deletingAll,
  onMarkAll,
  onDeleteAll,
}: {
  unreadCount: number;
  hasItems: boolean;
  markingAll: boolean;
  deletingAll: boolean;
  onMarkAll: () => void;
  onDeleteAll: () => void;
}) {
  if (!hasItems) {
    return null;
  }

  return (
    <div className="flex shrink-0 flex-row-reverse items-center justify-between gap-2 border-b border-slate-200/80 bg-soft/40 px-3 py-2 sm:px-3.5">
      <span className="text-xs font-semibold text-graphite/50">
        {unreadCount > 0 ? `${unreadCount} חדשות` : "הכל נקרא"}
      </span>
      <div className="flex flex-row-reverse items-center gap-1.5">
        {unreadCount > 0 ? (
          <button
            type="button"
            className="cursor-pointer rounded-full px-2.5 py-1 text-xs font-bold text-brand transition hover:bg-brand/10 disabled:opacity-50"
            disabled={markingAll || deletingAll}
            onClick={onMarkAll}
          >
            {markingAll ? "מסמן…" : "סמן הכל"}
          </button>
        ) : null}
        <button
          type="button"
          className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-slate-200/90 bg-white px-2.5 py-1 text-xs font-bold text-graphite/65 shadow-sm transition hover:border-slate-300 hover:bg-soft hover:text-graphite disabled:opacity-50"
          disabled={deletingAll || markingAll}
          onClick={onDeleteAll}
          aria-label="מחק את כל ההתראות"
        >
          <Trash2 className="size-3.5 shrink-0 opacity-70" aria-hidden />
          {deletingAll ? "מוחק…" : "מחק הכל"}
        </button>
      </div>
    </div>
  );
}

function NotificationRow({
  item,
  deleting,
  onOpen,
  onRequestDelete,
}: {
  item: LobbyInAppNotification;
  deleting: boolean;
  onOpen: (item: LobbyInAppNotification) => void;
  onRequestDelete: (notificationId: string) => void;
}) {
  const timeLabel = formatChatMessageTime(item.createdAtMs);
  const bodyText = formatNotificationBodyForDisplay(item);

  return (
    <div
      className={cn(
        "flex flex-row-reverse items-stretch overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm transition",
        !item.read && "border-brand/25 bg-[#E8F4F8]/50",
      )}
    >
      <button
        type="button"
        className="min-w-0 flex-1 px-4 py-3.5 text-right text-inherit transition hover:bg-soft/40 sm:px-5 sm:py-4"
        onClick={() => onOpen(item)}
      >
        <div className="flex flex-row-reverse items-start justify-between gap-4">
          <span className="min-w-0 flex-1 line-clamp-2 text-[15px] font-semibold leading-snug text-graphite sm:text-base">
            {item.title}
          </span>
          {timeLabel ? (
            <span className="shrink-0 pt-0.5 text-xs font-medium leading-none text-graphite/50">{timeLabel}</span>
          ) : null}
        </div>
        {bodyText ? (
          <p className="mt-1.5 line-clamp-2 whitespace-pre-line text-[13px] font-normal leading-snug text-graphite/60 sm:text-sm">
            {bodyText}
          </p>
        ) : null}
      </button>
      <button
        type="button"
        className="flex w-10 shrink-0 items-center justify-center border-e border-slate-200/80 text-graphite/40 transition hover:bg-soft hover:text-graphite disabled:opacity-40"
        aria-label="מחק התראה"
        disabled={deleting}
        onClick={() => onRequestDelete(item.id)}
      >
        {deleting ? (
          <span className="text-[10px] font-bold">…</span>
        ) : (
          <X className="size-4" strokeWidth={2.25} aria-hidden />
        )}
      </button>
    </div>
  );
}

export function NotificationsClient() {
  const router = useRouter();
  const { user, loading: authLoading, openAuthModal } = useLobbyAuth();
  const { items, loading, unreadCount } = useLobbyNotifications();
  const [markingAll, setMarkingAll] = useState(false);
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);
  const [deleteOneOpen, setDeleteOneOpen] = useState(false);
  const [pendingDeleteOneId, setPendingDeleteOneId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const unreadIds = useMemo(() => items.filter((n) => !n.read).map((n) => n.id), [items]);
  const allIds = useMemo(() => items.map((n) => n.id), [items]);

  const handleOpen = useCallback(
    (item: LobbyInAppNotification) => {
      if (!item.read) {
        void markNotificationRead(item.id);
        return;
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

  const handleDeleteAll = useCallback(async () => {
    if (allIds.length === 0 || deletingAll) {
      return;
    }
    setDeletingAll(true);
    try {
      await deleteAllMyNotifications(allIds);
      setDeleteAllOpen(false);
    } finally {
      setDeletingAll(false);
    }
  }, [allIds, deletingAll]);

  const handleRequestDeleteOne = useCallback((notificationId: string) => {
    if (deletingId || deleteOneOpen) {
      return;
    }
    setPendingDeleteOneId(notificationId);
    setDeleteOneOpen(true);
  }, [deleteOneOpen, deletingId]);

  const handleConfirmDeleteOne = useCallback(async () => {
    if (!pendingDeleteOneId || deletingId) {
      return;
    }
    const id = pendingDeleteOneId;
    setDeletingId(id);
    try {
      await deleteMyNotification(id);
      setDeleteOneOpen(false);
      setPendingDeleteOneId(null);
    } finally {
      setDeletingId(null);
    }
  }, [deletingId, pendingDeleteOneId]);

  if (!isFirebaseConfigured()) {
    return <p className="py-7 text-right text-[15px] font-bold text-graphite/45">אין חיבור לשרת.</p>;
  }

  if (authLoading) {
    return <p className="py-7 text-right text-[15px] font-bold text-graphite/45">טוען…</p>;
  }

  if (!user) {
    return (
      <>
        <Link href="/account" className="mb-2 inline-block text-sm font-extrabold text-brand no-underline">
          חזרה
        </Link>
        <p className="py-7 text-right text-[15px] font-bold text-graphite/45">
          <button type="button" onClick={openAuthModal} className="border-0 bg-transparent font-[inherit] font-extrabold">
            כניסה
          </button>
        </p>
      </>
    );
  }

  return (
    <AccountAreaShell title="התראות" showBanner className="overflow-hidden">
      <div
        className={cn(
          bubble.card,
          "flex flex-col overflow-hidden rounded-[16px] border-slate-200/90 shadow-bubble",
        )}
      >
        <NotificationsPanelToolbar
          unreadCount={unreadCount}
          hasItems={items.length > 0}
          markingAll={markingAll}
          deletingAll={deletingAll}
          onMarkAll={() => void handleMarkAll()}
          onDeleteAll={() => setDeleteAllOpen(true)}
        />

        <div
          className="min-h-[11rem] overflow-y-auto overscroll-contain px-3.5 py-3 sm:px-5"
          style={{ maxHeight: NOTIFICATIONS_PANEL_MAX_HEIGHT }}
        >
          {loading && items.length === 0 ? (
            <p className="py-8 text-center text-sm font-bold text-graphite/45">טוען…</p>
          ) : null}
          {!loading && items.length === 0 ? (
            <p className="py-8 text-center text-sm font-bold text-graphite/45">אין עדכונים.</p>
          ) : null}
          <div className="flex flex-col gap-2.5">
            {items.map((item) => (
              <NotificationRow
                key={item.id}
                item={item}
                deleting={deletingId === item.id}
                onOpen={handleOpen}
                onRequestDelete={handleRequestDeleteOne}
              />
            ))}
          </div>
        </div>
      </div>

      <LobbyConfirmDialog
        open={deleteAllOpen}
        title={DELETE_ALL_NOTIFICATIONS_CONFIRM.title}
        body={DELETE_ALL_NOTIFICATIONS_CONFIRM.body}
        confirmLabel={DELETE_ALL_NOTIFICATIONS_CONFIRM.confirmLabel}
        variant="default"
        busy={deletingAll}
        onConfirm={() => void handleDeleteAll()}
        onCancel={() => {
          if (!deletingAll) {
            setDeleteAllOpen(false);
          }
        }}
      />

      <LobbyConfirmDialog
        open={deleteOneOpen}
        title={DELETE_ONE_NOTIFICATION_CONFIRM.title}
        body={DELETE_ONE_NOTIFICATION_CONFIRM.body}
        confirmLabel={DELETE_ONE_NOTIFICATION_CONFIRM.confirmLabel}
        variant="default"
        busy={deletingId !== null}
        onConfirm={() => void handleConfirmDeleteOne()}
        onCancel={() => {
          if (deletingId === null) {
            setDeleteOneOpen(false);
            setPendingDeleteOneId(null);
          }
        }}
      />
    </AccountAreaShell>
  );
}
