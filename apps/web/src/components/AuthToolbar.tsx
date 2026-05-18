"use client";

import Link from "next/link";
import { useState } from "react";
import { useLobbyAuth } from "@/contexts/LobbyAuthContext";
import { useChatInboxOptional } from "@/contexts/ChatInboxContext";
import { useLobbyNotificationsOptional } from "@/contexts/LobbyNotificationsContext";
import { isFirebaseConfigured } from "@/lib/firebase/isConfigured";
import { SavedListingsNav } from "./SavedListingsNav";
import styles from "./AuthToolbar.module.css";

interface AuthToolbarProps {
  variant?: "home" | "listing";
}

function NotificationsNavLink() {
  const ctx = useLobbyNotificationsOptional();
  const n = ctx?.unreadCount ?? 0;
  const label = n > 99 ? "99+" : String(n);

  return (
    <Link href="/account/notifications" className={`${styles.link} ${styles.messagesLink}`}>
      התראות
      {n > 0 ? (
        <span className={styles.navBadge} aria-hidden="true">
          {label}
        </span>
      ) : null}
    </Link>
  );
}

function MessagesNavLink() {
  const inbox = useChatInboxOptional();
  const totalUnread = inbox?.totalUnread ?? 0;
  const count = totalUnread > 99 ? "99+" : String(totalUnread);

  return (
    <Link href="/chat" className={`${styles.link} ${styles.messagesLink}`}>
      הודעות
      {totalUnread > 0 ? (
        <span className={styles.navBadge} aria-hidden="true">
          {count}
        </span>
      ) : null}
    </Link>
  );
}

export function AuthToolbar({ variant = "home" }: AuthToolbarProps) {
  const { user, loading, openAuthModal, signOutUser } = useLobbyAuth();
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);

  if (!isFirebaseConfigured()) {
    return (
      <div className={variant === "listing" ? styles.listingCluster : styles.homeCluster}>
        <span className={styles.muted}>אין חיבור לשרת</span>
      </div>
    );
  }

  if (loading) {
    return (
      <div
        className={variant === "listing" ? styles.listingCluster : styles.homeCluster}
        role="status"
        aria-busy="true"
        aria-label="טוען תפריט"
      >
        <span className={styles.skeletonLink} />
        <span className={styles.skeletonLink} />
      </div>
    );
  }

  if (user) {
    return (
      <>
        <div className={variant === "listing" ? styles.listingCluster : styles.homeCluster}>
          <Link href="/account" className={styles.link}>
            אזור אישי
          </Link>
          <SavedListingsNav />
          <NotificationsNavLink />
          <MessagesNavLink />
          <button type="button" className={styles.textButton} onClick={() => setLogoutConfirmOpen(true)}>
            יציאה
          </button>
        </div>

        {logoutConfirmOpen ? (
          <div
            className={styles.confirmOverlay}
            role="presentation"
            onClick={() => setLogoutConfirmOpen(false)}
          >
            <div
              className={styles.confirmDialog}
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="logout-confirm-title"
              aria-describedby="logout-confirm-desc"
              onClick={(e) => e.stopPropagation()}
            >
              <p id="logout-confirm-title" className={styles.confirmTitle}>
                להתנתק מלובי?
              </p>
              <p id="logout-confirm-desc" className={styles.confirmText}>
                לא תוכלו לשלוח הודעות או לפרסם עד שתתחברו שוב.
              </p>
              <div className={styles.confirmActions}>
                <button type="button" className={styles.confirmCancel} onClick={() => setLogoutConfirmOpen(false)}>
                  ביטול
                </button>
                <button
                  type="button"
                  className={styles.confirmDanger}
                  onClick={() => {
                    setLogoutConfirmOpen(false);
                    void signOutUser();
                  }}
                >
                  להתנתק
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </>
    );
  }

  return (
    <div className={variant === "listing" ? styles.listingCluster : styles.homeCluster}>
      <button type="button" className={styles.textButton} onClick={openAuthModal}>
        כניסה
      </button>
    </div>
  );
}
