"use client";

import Link from "next/link";
import { useLobbyNotificationsOptional } from "@/contexts/LobbyNotificationsContext";
import { useCallback, useEffect, useMemo, useState } from "react";
import { SAVED_LISTINGS_TITLE_HE, type RentalListing } from "@lobby/shared";
import { useLobbyAuth } from "@/contexts/LobbyAuthContext";
import { isFirebaseConfigured } from "@/lib/firebase/isConfigured";
import { fetchMyListingsFromFirestore } from "@/lib/firebase/listingQueries";
import { AccountListingRow } from "./AccountListingRow";
import styles from "./account.module.css";

type AccountTab = "active" | "draft" | "offFeed";

function listingMatchesTab(listing: RentalListing, tab: AccountTab): boolean {
  if (tab === "active") {
    return listing.status === "active" || listing.status === "frozen";
  }
  if (tab === "draft") {
    return listing.status === "draft";
  }
  return listing.status === "expired" || listing.status === "removed" || listing.status === "rented";
}

export function AccountAreaClient() {
  const { user, loading, openAuthModal } = useLobbyAuth();
  const [tab, setTab] = useState<AccountTab>("active");
  const [rows, setRows] = useState<RentalListing[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState(false);

  const load = useCallback(async () => {
    if (!user || !isFirebaseConfigured()) {
      setRows([]);
      return;
    }
    setListLoading(true);
    setListError(false);
    try {
      const data = await fetchMyListingsFromFirestore(user.uid);
      setRows(data);
    } catch {
      setRows([]);
      setListError(true);
    } finally {
      setListLoading(false);
    }
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    const t = globalThis.setTimeout(() => {
      if (!cancelled) {
        void load();
      }
    }, 0);
    return () => {
      cancelled = true;
      globalThis.clearTimeout(t);
    };
  }, [load]);

  const filtered = useMemo(() => rows.filter((l) => listingMatchesTab(l, tab)), [rows, tab]);
  const notifCtx = useLobbyNotificationsOptional();
  const notifUnread = notifCtx?.unreadCount ?? 0;

  if (!isFirebaseConfigured()) {
    return (
      <main className={styles.page}>
        <div className={styles.main}>
          <p className={styles.muted}>אין חיבור לשרת.</p>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className={styles.page}>
        <div className={styles.main}>
          <p className={styles.muted}>טוען…</p>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className={styles.page}>
        <div className={styles.main}>
          <h1 className={styles.title}>אזור אישי</h1>
          <div className={styles.cta}>
            <button type="button" onClick={openAuthModal}>
              כניסה
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.main}>
        <h1 className={styles.title}>אזור אישי</h1>

        <div className={styles.tabs} role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "active"}
            className={`${styles.tab} ${tab === "active" ? styles.tabActive : ""}`}
            onClick={() => setTab("active")}
          >
            פעילות
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "draft"}
            className={`${styles.tab} ${tab === "draft" ? styles.tabActive : ""}`}
            onClick={() => setTab("draft")}
          >
            טיוטות
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "offFeed"}
            className={`${styles.tab} ${tab === "offFeed" ? styles.tabActive : ""}`}
            onClick={() => setTab("offFeed")}
          >
            ירדו מהלוח
          </button>
        </div>

        {listLoading && rows.length === 0 ? <p className={styles.muted}>טוען מודעות…</p> : null}
        {listError ? <p className={styles.muted}>לא ניתן לטעון כרגע.</p> : null}
        {!listLoading && !listError && filtered.length === 0 ? <p className={styles.muted}>אין פריטים.</p> : null}

        <div className={styles.list}>
          {filtered.map((listing) => (
            <AccountListingRow key={listing.id} listing={listing} onChanged={() => void load()} />
          ))}
        </div>

        <div className={styles.moreBlock}>
          <Link href="/saved" className={styles.moreRowLink}>
            <span>{SAVED_LISTINGS_TITLE_HE}</span>
          </Link>
          <Link href="/account/notifications" className={styles.moreRowLink}>
            <span>התראות</span>
            {notifUnread > 0 ? (
              <span className={styles.notifBadge}>{notifUnread > 99 ? "99+" : notifUnread}</span>
            ) : null}
          </Link>
          <Link href="/account/settings" className={styles.moreRowLink}>
            <span>הגדרות</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
