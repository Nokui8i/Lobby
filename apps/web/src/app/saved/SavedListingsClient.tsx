"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SAVED_LISTING_REMOVED_HE, SAVED_LISTINGS_EMPTY_HE, SAVED_LISTINGS_HINT_HE, SAVED_LISTINGS_TITLE_HE, type RentalListing } from "@lobby/shared";
import { ListingCard } from "@/components/listings/ListingCard";
import { LISTING_FEED_GRID_CLASS } from "@/components/listings/listingCardStyles";
import { SaveListingButton } from "@/components/SaveListingButton";
import { useLobbyAuth } from "@/contexts/LobbyAuthContext";
import { fetchListingByIdFromFirestore } from "@/lib/firebase/listingQueries";
import { fetchSavedListingRecords } from "@/lib/firebase/savedListings";
import { isFirebaseConfigured } from "@/lib/firebase/isConfigured";

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
    <div className="direction-rtl min-w-0">
        <h1 className="font-display mb-2 text-2xl font-semibold tracking-tight text-graphite md:text-3xl">
          {SAVED_LISTINGS_TITLE_HE}
        </h1>
        <p className="mb-6 text-sm text-graphite/60">{SAVED_LISTINGS_HINT_HE}</p>

        {!isFirebaseConfigured() ? <p className="text-sm text-graphite/60">אין חיבור לשרת.</p> : null}

        {!authLoading && !user && isFirebaseConfigured() ? (
          <div className="bubble-card p-8 text-center">
            <p className="mb-3 text-graphite">יש להתחבר כדי לראות מודעות ששמרתם.</p>
            <button type="button" className="btn-puffy px-8 py-3 text-sm" onClick={openAuthModal}>
              כניסה
            </button>
          </div>
        ) : null}

        {user && loading ? <p className="text-sm text-graphite/60">טוענים…</p> : null}

        {user && !loading && rows.length === 0 ? (
          <div className="bubble-card p-8 text-center">
            <p className="mb-2 font-semibold text-graphite">{SAVED_LISTINGS_EMPTY_HE}</p>
            <Link href="/" className="btn-puffy mt-4 inline-flex px-6 py-2.5 text-sm no-underline">
              חזרה ללוח
            </Link>
          </div>
        ) : null}

        <div className={LISTING_FEED_GRID_CLASS}>
          {rows.map(({ record, listing }) => {
            if (!listing || listing.status !== "active") {
              return (
                <article key={record.listingId} className="bubble-card border border-dashed border-graphite/15 p-4">
                  <p className="mb-1.5 font-semibold text-graphite">{record.listingTitle || "מודעה"}</p>
                  <p className="mb-3 text-sm text-graphite/60">{SAVED_LISTING_REMOVED_HE}</p>
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

            return <ListingCard key={record.listingId} listing={{ ...listing, listingId: listing.id }} />;
          })}
        </div>
    </div>
  );
}
