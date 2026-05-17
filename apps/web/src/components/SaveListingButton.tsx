"use client";

import { useState, type MouseEvent } from "react";
import type { SavedListingSnapshot } from "@/lib/firebase/savedListings";
import { useLobbyAuth } from "@/contexts/LobbyAuthContext";
import { useSavedListingsOptional } from "@/contexts/SavedListingsContext";
import { SAVED_LISTINGS_LOGIN_HE } from "@lobby/shared";
import styles from "./SaveListingButton.module.css";

export function SaveListingButton({
  listingId,
  listingTitle,
  imageUrl,
  priceIls,
  variant = "card",
  className,
}: {
  listingId: string;
  listingTitle: string;
  imageUrl?: string;
  priceIls?: number;
  variant?: "card" | "gallery";
  className?: string;
}) {
  const { user, openAuthModal } = useLobbyAuth();
  const savedCtx = useSavedListingsOptional();
  const [busy, setBusy] = useState(false);

  const saved = savedCtx?.isSaved(listingId) ?? false;
  const label = saved ? "הסרה מהמועדפים" : variant === "gallery" ? "שמירה" : "שמירה למועדפים";

  async function handleClick(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      openAuthModal();
      return;
    }
    if (!savedCtx || busy) {
      return;
    }

    setBusy(true);
    try {
      const snapshot: SavedListingSnapshot = {
        listingId,
        listingTitle,
        imageUrl,
        priceIls,
      };
      await savedCtx.toggleSave(snapshot);
    } finally {
      setBusy(false);
    }
  }

  const rootClass = [
    styles.btn,
    variant === "gallery" ? styles.btnGallery : styles.btnCard,
    saved ? styles.btnOn : "",
    busy ? styles.btnBusy : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type="button"
      className={rootClass}
      aria-pressed={saved}
      aria-label={saved ? "הסרה ממודעות שאהבתי" : "שמירה למודעות שאהבתי"}
      title={!user ? SAVED_LISTINGS_LOGIN_HE : undefined}
      disabled={busy}
      onClick={(e) => void handleClick(e)}
    >
      <span className={saved ? styles.heartOn : styles.heart} aria-hidden="true" />
      {variant === "gallery" ? <span className={styles.galleryLabel}>{label}</span> : null}
    </button>
  );
}
