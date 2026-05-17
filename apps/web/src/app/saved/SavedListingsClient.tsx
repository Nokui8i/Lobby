"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { SAVED_LISTING_REMOVED_HE, SAVED_LISTINGS_EMPTY_HE, SAVED_LISTINGS_HINT_HE, SAVED_LISTINGS_TITLE_HE, type RentalListing } from "@lobby/shared";
import { HomeHeader } from "@/app/components/HomeHeader";
import { SiteFooter } from "@/app/components/SiteFooter";
import { SaveListingButton } from "@/components/SaveListingButton";
import { useLobbyAuth } from "@/contexts/LobbyAuthContext";
import { fetchListingByIdFromFirestore } from "@/lib/firebase/listingQueries";
import { fetchSavedListingRecords } from "@/lib/firebase/savedListings";
import { isFirebaseConfigured } from "@/lib/firebase/isConfigured";
import styles from "./saved.module.css";

type SavedRow = {
  record: Awaited<ReturnType<typeof fetchSavedListingRecords>>[number];
  listing: RentalListing | null;
};

export function SavedListingsClient() {
  const { user, loading: authLoading, openAuthModal } = useLobbyAuth();
  const [rows, setRows] = useState<SavedRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!user || !isFirebaseConfigured()) {
        if (!cancelled) {
          setRows([]);
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      try {
        const records = await fetchSavedListingRecords(user.uid);
        const resolved: SavedRow[] = [];
        for (const record of records) {
          const listing = await fetchListingByIdFromFirestore(record.listingId);
          resolved.push({ record, listing });
        }
        if (!cancelled) {
          setRows(resolved);
        }
      } catch {
        if (!cancelled) {
          setRows([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  return (
    <main className={styles.page}>
      <HomeHeader variant="flat" />
      <div className={styles.shell}>
        <h1>{SAVED_LISTINGS_TITLE_HE}</h1>

        {!isFirebaseConfigured() ? (
          <p className={styles.muted}>אין חיבור לשרת.</p>
        ) : null}

        {!authLoading && !user && isFirebaseConfigured() ? (
          <div className={styles.emptyBox}>
            <p>יש להתחבר כדי לראות מודעות ששמרתם.</p>
            <button type="button" className={styles.cta} onClick={openAuthModal}>
              כניסה
            </button>
          </div>
        ) : null}

        {user && loading ? <p className={styles.muted}>טוענים…</p> : null}

        {user && !loading && rows.length === 0 ? (
          <div className={styles.emptyBox}>
            <p>{SAVED_LISTINGS_EMPTY_HE}</p>
            <p className={styles.muted}>{SAVED_LISTINGS_HINT_HE}</p>
            <Link href="/" className={styles.ctaLink}>
              חזרה ללוח
            </Link>
          </div>
        ) : null}

        <div className={styles.grid}>
          {rows.map(({ record, listing }) => {
            if (!listing || listing.status !== "active") {
              return (
                <article key={record.listingId} className={styles.cardUnavailable}>
                  <p className={styles.unavailTitle}>{record.listingTitle || "מודעה"}</p>
                  <p className={styles.muted}>{SAVED_LISTING_REMOVED_HE}</p>
                  <SaveListingButton
                    listingId={record.listingId}
                    listingTitle={record.listingTitle}
                    imageUrl={record.imageUrl}
                    priceIls={record.priceIls}
                    variant="card"
                  />
                </article>
              );
            }

            return (
              <article key={record.listingId} className={styles.cardWrap}>
                <Link href={`/listings/${listing.id}`} className={styles.card}>
                  <div className={styles.cardImage}>
                    <Image src={listing.imageUrl} alt={listing.title} width={400} height={260} />
                    <SaveListingButton
                      listingId={listing.id}
                      listingTitle={listing.title}
                      imageUrl={listing.imageUrl}
                      priceIls={listing.priceIls}
                      variant="card"
                      className={styles.cardSave}
                    />
                  </div>
                  <div className={styles.cardBody}>
                    <div className={styles.cardTop}>
                      <h2>{listing.title}</h2>
                      <strong>₪{listing.priceIls.toLocaleString("he-IL")}</strong>
                    </div>
                    <p className={styles.cardMeta}>
                      {listing.city}
                      {listing.neighborhood ? ` · ${listing.neighborhood}` : ""} · {listing.rooms} חד׳
                    </p>
                  </div>
                </Link>
              </article>
            );
          })}
        </div>
      </div>
      <SiteFooter />
    </main>
  );
}
