"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  formatListingLocationLine,
  LISTING_OWNER_ACTION_CONFIRM_HE,
  LISTING_OWNER_ACTION_LABEL_HE,
  LISTING_STATUS_LABEL_HE,
  listingPublishCountdownIsUrgent,
  listingPublishCountdownLabel,
  listingOwnerActionIsDestructive,
  listingOwnerActionsForStatus,
  type ListingOwnerActionId,
  type ListingStatus,
  type RentalListing,
} from "@lobby/shared";
import { LobbyConfirmDialog, type LobbyConfirmDialogVariant } from "@/components/LobbyConfirmDialog";
import { useLobbyAuth } from "@/contexts/LobbyAuthContext";
import {
  deleteOwnerListing,
  freezeOwnerListing,
  markOwnerListingRented,
  renewOwnerListing,
  unfreezeOwnerListing,
} from "@/lib/firebase/listingOwnerMutations";
import { cn } from "@/lib/utils";

const acc = {
  row: "bubble-card relative flex flex-col gap-3 p-3 transition hover:-translate-y-0.5 md:flex-row md:items-center",
  rowMain: "grid min-w-0 flex-1 grid-cols-[112px_minmax(0,1fr)] items-center gap-3 text-inherit no-underline",
  rowMenuWrap: "relative flex shrink-0 items-center justify-end gap-2 md:ps-2",
  menuBtn: "flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border-0 bg-soft text-graphite/50 hover:text-brand disabled:cursor-wait disabled:opacity-50",
  menuDots: "text-xl font-black leading-none tracking-tight",
  menuPanel: "absolute top-[calc(100%+4px)] start-0 z-20 min-w-[200px] rounded-2xl border border-graphite/5 bg-white p-1.5 shadow-bubble",
  menuItem: "block w-full cursor-pointer rounded-xl border-0 bg-transparent px-3 py-2.5 text-right text-sm font-semibold text-graphite hover:bg-brand/10",
  menuItemDanger: "!text-red-700 hover:!bg-red-500/10",
  thumb: "relative h-20 w-28 overflow-hidden rounded-lg bg-soft [&_img]:h-full [&_img]:w-full [&_img]:object-cover",
  body: "min-w-0 text-right",
  rowTitleRow: "flex w-full min-w-0 items-baseline justify-start gap-2",
  rowTitle: "min-w-0 shrink truncate text-sm font-semibold text-graphite",
  rowPrice: "shrink-0 whitespace-nowrap text-sm font-bold text-brand",
  rowMeta: "mt-0.5 text-xs text-graphite/50",
  statusPill: "inline-block rounded-full bg-soft px-2.5 py-0.5 text-[11px] font-semibold text-graphite/70",
  statusPillActive: "!bg-emerald-50 !text-emerald-700",
  statusPillFrozen: "!bg-indigo-500/15 !text-indigo-800",
  statusPillDraft: "!bg-amber-500/15 !text-amber-900",
  statusPillOff: "!bg-gray-500/10 !text-gray-700",
  countdown: "mt-2 text-right text-[13px] font-bold text-brand",
  countdownUrgent: "!text-red-700",
  moderationNote: "mt-2 rounded-[10px] bg-amber-500/10 px-2.5 py-2 text-right text-xs font-semibold leading-snug text-amber-900",
} as const;

function statusPillClass(status: ListingStatus): string {
  if (status === "active") {
    return `${acc.statusPill} ${acc.statusPillActive}`;
  }
  if (status === "frozen") {
    return `${acc.statusPill} ${acc.statusPillFrozen}`;
  }
  if (status === "draft") {
    return `${acc.statusPill} ${acc.statusPillDraft}`;
  }
  if (status === "pending_review") {
    return `${acc.statusPill} ${acc.statusPillDraft}`;
  }
  return `${acc.statusPill} ${acc.statusPillOff}`;
}

type PendingDialog =
  | {
      kind: "confirm";
      action: ListingOwnerActionId;
      title: string;
      body: string;
      confirmLabel: string;
      variant: LobbyConfirmDialogVariant;
    }
  | { kind: "info"; title: string; body: string; confirmLabel: string }
  | { kind: "error"; title: string; body: string };

function dialogVariantForAction(action: ListingOwnerActionId): LobbyConfirmDialogVariant {
  if (listingOwnerActionIsDestructive(action)) {
    return "destructive";
  }
  return "default";
}

export function AccountListingRow({
  listing,
  onChanged,
}: {
  listing: RentalListing;
  onChanged: () => void;
}) {
  const router = useRouter();
  const { user } = useLobbyAuth();
  const menuId = useId();
  const [menuOpen, setMenuOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pendingDialog, setPendingDialog] = useState<PendingDialog | null>(null);
  const rowRef = useRef<HTMLDivElement>(null);

  const actions = listingOwnerActionsForStatus(listing.status);
  const publishCountdown = listingPublishCountdownLabel(listing);
  const publishCountdownUrgent = listingPublishCountdownIsUrgent(listing);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }
    const onPointerDown = (e: PointerEvent) => {
      if (rowRef.current && !rowRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  const closeDialog = useCallback(() => {
    if (!busy) {
      setPendingDialog(null);
    }
  }, [busy]);

  const runMutation = useCallback(
    async (action: ListingOwnerActionId) => {
      if (!user || busy) {
        return;
      }
      setBusy(true);
      try {
        if (action === "delete") {
          await deleteOwnerListing(listing.id, user.uid);
        } else if (action === "mark_rented") {
          await markOwnerListingRented(listing.id, user.uid);
        } else if (action === "renew") {
          await renewOwnerListing(listing.id, user.uid);
        } else if (action === "freeze") {
          await freezeOwnerListing(listing.id, user.uid);
        } else if (action === "unfreeze") {
          await unfreezeOwnerListing(listing.id, user.uid);
        }
        setPendingDialog(null);
        onChanged();
      } catch (err) {
        const code = err instanceof Error ? err.message : "";
        if (code === "expired") {
          setPendingDialog({
            kind: "error",
            title: "לא ניתן להחזיר לפרסום",
            body: "תקופת ה-30 יום הסתיימה. ניתן לחדש מודעה שפגה.",
          });
        } else {
          setPendingDialog({
            kind: "error",
            title: "הפעולה נכשלה",
            body: "נסו שוב בעוד רגע.",
          });
        }
      } finally {
        setBusy(false);
        setMenuOpen(false);
      }
    },
    [user, busy, listing.id, onChanged],
  );

  const handleAction = useCallback(
    (action: ListingOwnerActionId) => {
      setMenuOpen(false);

      if (action === "view") {
        router.push(`/listings/${listing.id}`);
        return;
      }
      if (action === "edit" || action === "continue_publish") {
        router.push(`/publish?listingId=${listing.id}`);
        return;
      }
      const confirmCopy = LISTING_OWNER_ACTION_CONFIRM_HE[action];
      if (confirmCopy) {
        setPendingDialog({
          kind: "confirm",
          action,
          title: confirmCopy.title,
          body: confirmCopy.body,
          confirmLabel: confirmCopy.confirmLabel ?? "אישור",
          variant: dialogVariantForAction(action),
        });
        return;
      }

      void runMutation(action);
    },
    [listing.id, router, runMutation],
  );

  const handleDialogConfirm = useCallback(() => {
    if (!pendingDialog) {
      return;
    }
    if (pendingDialog.kind === "confirm") {
      void runMutation(pendingDialog.action);
      return;
    }
    setPendingDialog(null);
  }, [pendingDialog, runMutation]);

  const dialogOpen = pendingDialog != null;
  const dialogVariant =
    pendingDialog?.kind === "confirm"
      ? pendingDialog.variant
      : pendingDialog?.kind === "info"
        ? "info"
        : "info";
  const dialogConfirmLabel =
    pendingDialog?.kind === "confirm" || pendingDialog?.kind === "info"
      ? pendingDialog.confirmLabel
      : "אישור";

  const rowHref =
    listing.status === "draft" && listing.moderationDraftNote?.trim()
      ? `/publish?listingId=${listing.id}`
      : `/listings/${listing.id}`;

  return (
    <>
      <div ref={rowRef} className={acc.row}>
        <Link href={rowHref} className={acc.rowMain}>
          <div className={acc.thumb}>
            <Image src={listing.imageUrl} alt="" width={176} height={144} />
          </div>
          <div className={acc.body}>
            <div className={acc.rowTitleRow}>
              <span className={acc.rowTitle}>{listing.title}</span>
              <span className={acc.rowPrice}>₪{listing.priceIls.toLocaleString("he-IL")}</span>
            </div>
            <div className={acc.rowMeta}>{formatListingLocationLine(listing)}</div>
            <span className={statusPillClass(listing.status)}>{LISTING_STATUS_LABEL_HE[listing.status]}</span>
            {publishCountdown ? (
              <p
                className={`${acc.countdown} ${publishCountdownUrgent ? acc.countdownUrgent : ""}`}
                role="status"
              >
                {publishCountdown}
              </p>
            ) : null}
            {listing.status === "draft" && listing.moderationDraftNote?.trim() ? (
              <p className={acc.moderationNote}>{listing.moderationDraftNote.trim()}</p>
            ) : null}
          </div>
        </Link>

        <div className={acc.rowMenuWrap}>
          <button
            type="button"
            className={acc.menuBtn}
            aria-label="פעולות על המודעה"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-controls={menuId}
            disabled={busy}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setMenuOpen((v) => !v);
            }}
          >
            <span className={acc.menuDots} aria-hidden>
              ⋮
            </span>
          </button>
          {menuOpen ? (
            <div id={menuId} className={acc.menuPanel} role="menu">
              {actions.map((action) => (
                <button
                  key={action}
                  type="button"
                  role="menuitem"
                  className={
                    listingOwnerActionIsDestructive(action)
                      ? `${acc.menuItem} ${acc.menuItemDanger}`
                      : acc.menuItem
                  }
                  disabled={busy}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAction(action);
                  }}
                >
                  {LISTING_OWNER_ACTION_LABEL_HE[action]}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <LobbyConfirmDialog
        open={dialogOpen}
        title={pendingDialog?.title ?? ""}
        body={pendingDialog?.body ?? ""}
        confirmLabel={dialogConfirmLabel}
        variant={dialogVariant}
        busy={busy}
        onCancel={closeDialog}
        onConfirm={handleDialogConfirm}
      />
    </>
  );
}
