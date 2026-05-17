"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  formatListingLocationLine,
  LISTING_OWNER_ACTION_BOOST_INFO_HE,
  LISTING_OWNER_ACTION_CONFIRM_HE,
  LISTING_OWNER_ACTION_LABEL_HE,
  LISTING_STATUS_LABEL_HE,
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
import styles from "./account.module.css";

function statusPillClass(status: ListingStatus): string {
  if (status === "active") {
    return `${styles.statusPill} ${styles.statusPillActive}`;
  }
  if (status === "frozen") {
    return `${styles.statusPill} ${styles.statusPillFrozen}`;
  }
  if (status === "draft") {
    return `${styles.statusPill} ${styles.statusPillDraft}`;
  }
  return `${styles.statusPill} ${styles.statusPillOff}`;
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
      if (action === "boost") {
        setPendingDialog({
          kind: "info",
          title: LISTING_OWNER_ACTION_BOOST_INFO_HE.title,
          body: LISTING_OWNER_ACTION_BOOST_INFO_HE.body,
          confirmLabel: LISTING_OWNER_ACTION_BOOST_INFO_HE.confirmLabel ?? "הבנתי",
        });
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

  return (
    <>
      <div ref={rowRef} className={styles.row}>
        <Link href={`/listings/${listing.id}`} className={styles.rowMain}>
          <div className={styles.thumb}>
            <Image src={listing.imageUrl} alt="" width={176} height={144} />
          </div>
          <div className={styles.body}>
            <div className={styles.rowTitle}>{listing.title}</div>
            <div className={styles.rowMeta}>
              ₪{listing.priceIls.toLocaleString("he-IL")} · {formatListingLocationLine(listing)}
            </div>
            <span className={statusPillClass(listing.status)}>{LISTING_STATUS_LABEL_HE[listing.status]}</span>
            {listing.status === "draft" && listing.moderationDraftNote?.trim() ? (
              <p className={styles.moderationNote}>{listing.moderationDraftNote.trim()}</p>
            ) : null}
          </div>
        </Link>

        <div className={styles.rowMenuWrap}>
          <button
            type="button"
            className={styles.menuBtn}
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
            <span className={styles.menuDots} aria-hidden>
              ⋮
            </span>
          </button>
          {menuOpen ? (
            <div id={menuId} className={styles.menuPanel} role="menu">
              {actions.map((action) => (
                <button
                  key={action}
                  type="button"
                  role="menuitem"
                  className={
                    listingOwnerActionIsDestructive(action)
                      ? `${styles.menuItem} ${styles.menuItemDanger}`
                      : styles.menuItem
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
