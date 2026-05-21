"use client";

import Link from "next/link";
import { SAVED_LISTINGS_TITLE_HE } from "@lobby/shared";
import { useLobbyAuth } from "@/contexts/LobbyAuthContext";
import { cn } from "@/lib/utils";

const heartMask =
  "mask-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2'%3E%3Cpath d='M12 21s-7-4.35-9.33-8.1C.5 9.5 2.5 5 7 5c2 0 3.2 1.2 5 3.2C13.8 6.2 15 5 17 5c4.5 0 6.5 4.5 4.33 7.9C19 16.65 12 21 12 21z'/%3E%3C/svg%3E\")] mask-contain mask-center mask-no-repeat";

export function SavedListingsNav() {
  const { user, openAuthModal } = useLobbyAuth();

  const triggerClass =
    "inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border-0 bg-transparent font-[inherit] text-inherit no-underline hover:bg-[#009de0]/10";

  const heartClass = cn("block h-6 w-6 bg-current text-[#687076]", heartMask);

  if (!user) {
    return (
      <button
        type="button"
        className={triggerClass}
        aria-label={SAVED_LISTINGS_TITLE_HE}
        onClick={openAuthModal}
      >
        <span className={heartClass} aria-hidden="true" />
      </button>
    );
  }

  return (
    <Link
      href="/saved"
      className={triggerClass}
      aria-label={SAVED_LISTINGS_TITLE_HE}
      title={SAVED_LISTINGS_TITLE_HE}
    >
      <span className={heartClass} aria-hidden="true" />
    </Link>
  );
}
