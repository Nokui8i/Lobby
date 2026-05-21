"use client";

import { Heart } from "lucide-react";
import { useState, type MouseEvent } from "react";
import type { SavedListingSnapshot } from "@/lib/firebase/savedListings";
import { useLobbyAuth } from "@/contexts/LobbyAuthContext";
import { useSavedListingsOptional } from "@/contexts/SavedListingsContext";
import { SAVED_LISTINGS_LOGIN_HE } from "@lobby/shared";
import { cn } from "@/lib/utils";

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

  const rootClass = cn(
    "inline-flex cursor-pointer items-center justify-center border-0 font-[inherit] transition duration-150",
    variant === "gallery"
      ? "gap-1.5 rounded-full bg-white/92 px-3.5 py-2 text-sm font-bold text-graphite shadow-[0_6px_20px_rgba(16,24,32,0.14)] hover:scale-[1.02]"
      : "h-7 w-7 rounded-full bg-white/95 shadow-[0_2px_6px_rgba(32,33,37,0.16)] hover:scale-105",
    busy && "cursor-wait opacity-65",
    className,
  );

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
      <Heart
        className={cn(
          "h-4 w-4",
          saved ? "fill-rose-500 text-rose-500" : "fill-none text-graphite",
        )}
        strokeWidth={2}
        aria-hidden="true"
      />
      {variant === "gallery" ? (
        <span className="leading-none">{saved ? "נשמר" : "שמירה"}</span>
      ) : null}
    </button>
  );
}
