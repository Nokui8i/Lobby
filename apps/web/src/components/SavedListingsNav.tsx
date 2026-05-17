"use client";

import Link from "next/link";
import { SAVED_LISTINGS_TITLE_HE } from "@lobby/shared";
import { useLobbyAuth } from "@/contexts/LobbyAuthContext";
import styles from "./SavedListingsNav.module.css";

export function SavedListingsNav() {
  const { user, openAuthModal } = useLobbyAuth();

  if (!user) {
    return (
      <button
        type="button"
        className={styles.trigger}
        aria-label={SAVED_LISTINGS_TITLE_HE}
        onClick={openAuthModal}
      >
        <span className={styles.heart} aria-hidden="true" />
      </button>
    );
  }

  return (
    <Link href="/saved" className={styles.trigger} aria-label={SAVED_LISTINGS_TITLE_HE} title={SAVED_LISTINGS_TITLE_HE}>
      <span className={styles.heart} aria-hidden="true" />
    </Link>
  );
}
