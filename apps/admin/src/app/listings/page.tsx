"use client";

import {
  DEFAULT_ADMIN_LISTING_FILTERS,
  LISTING_STATUS_LABEL_HE,
  listingPublishCountdownLabel,
  staffCanPerformAction,
  type AdminListingListFilters,
  type AdminListingRecord,
  type ListingStatus,
} from "@lobby/shared";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { adminUsersSearchUrl, consumerListingUrl } from "@/lib/consumerUrls";
import { fetchAdminListings } from "@/lib/firebase/functions";
import styles from "../reports/reports.module.css";
import localStyles from "./listings.module.css";

const STATUS_FILTER_OPTIONS: { id: ListingStatus | ""; label: string }[] = [
  { id: "", label: "כל הסטטוסים" },
  { id: "active", label: LISTING_STATUS_LABEL_HE.active },
  { id: "pending_review", label: LISTING_STATUS_LABEL_HE.pending_review },
  { id: "draft", label: LISTING_STATUS_LABEL_HE.draft },
  { id: "frozen", label: LISTING_STATUS_LABEL_HE.frozen },
  { id: "expired", label: LISTING_STATUS_LABEL_HE.expired },
  { id: "removed", label: LISTING_STATUS_LABEL_HE.removed },
  { id: "rented", label: LISTING_STATUS_LABEL_HE.rented },
];

function formatWhen(iso: string): string {
  if (!iso) {
    return "—";
  }
  try {
    return new Intl.DateTimeFormat("he-IL", { dateStyle: "short", timeStyle: "short" }).format(
      new Date(iso),
    );
  } catch {
    return "—";
  }
}

function countdownForRow(row: AdminListingRecord): string | null {
  return listingPublishCountdownLabel({
    status: row.status,
    expiresAt: row.expiresAt,
    publishRemainingMs: row.publishRemainingMs,
    moderationDraftNote: row.moderationDraftNote,
  });
}

function AdminListingsPageInner() {
  const searchParams = useSearchParams();
  const { staffRole } = useAdminAuth();
  const canEdit = staffRole ? staffCanPerformAction(staffRole, "listings.update") : false;

  const initialPublisherId = searchParams.get("publisherId")?.trim() ?? "";

  const [filters, setFilters] = useState<AdminListingListFilters>({
    ...DEFAULT_ADMIN_LISTING_FILTERS,
    publisherId: initialPublisherId,
  });
  const [listings, setListings] = useState<AdminListingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const rows = await fetchAdminListings(filters);
      setListings(rows);
    } catch {
      setListings([]);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const publisherId = searchParams.get("publisherId")?.trim() ?? "";
    setFilters((f) => ({ ...f, publisherId }));
  }, [searchParams]);

  const activeCount = useMemo(
    () => listings.filter((l) => l.status === "active" || l.status === "frozen").length,
    [listings],
  );

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <Link href="/" className={styles.back}>
            ← לוח בקרה
          </Link>
          <h1>מודעות</h1>
          <p className={styles.sub}>
            {listings.length} תוצאות
            {activeCount > 0 ? ` · ${activeCount} בלוח / מוקפאות` : ""}
          </p>
        </div>
        <button type="button" className={styles.refreshBtn} disabled={loading} onClick={() => void load()}>
          רענון
        </button>
      </header>

      <form
        className={styles.filters}
        onSubmit={(e) => {
          e.preventDefault();
          void load();
        }}
      >
        <select
          className={styles.select}
          value={filters.status}
          aria-label="סטטוס"
          onChange={(e) =>
            setFilters((f) => ({ ...f, status: e.target.value as AdminListingListFilters["status"] }))
          }
        >
          {STATUS_FILTER_OPTIONS.map((opt) => (
            <option key={opt.id || "all"} value={opt.id}>
              {opt.label}
            </option>
          ))}
        </select>
        <input
          type="search"
          className={styles.searchInput}
          placeholder="חיפוש כותרת, עיר, מזהה…"
          aria-label="חיפוש"
          value={filters.search}
          onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
        />
        <input
          type="search"
          className={styles.searchInput}
          placeholder="מזהה מודעה"
          aria-label="מזהה מודעה"
          value={filters.listingId}
          onChange={(e) => setFilters((f) => ({ ...f, listingId: e.target.value }))}
        />
        <input
          type="search"
          className={styles.searchInput}
          placeholder="מזהה מפרסם"
          aria-label="מזהה מפרסם"
          value={filters.publisherId}
          onChange={(e) => setFilters((f) => ({ ...f, publisherId: e.target.value }))}
        />
        <button type="submit" className={styles.refreshBtn}>
          חיפוש
        </button>
      </form>

      {error ? <p className={styles.error}>שגיאה בטעינה. נסו לרענן.</p> : null}
      {loading ? <p className={styles.empty}>טוען…</p> : null}
      {!loading && listings.length === 0 ? <p className={styles.empty}>לא נמצאו מודעות.</p> : null}

      <ul className={styles.list}>
        {listings.map((listing) => {
          const countdown = countdownForRow(listing);
          return (
            <li key={listing.id} className={styles.item}>
              <div className={localStyles.itemRow}>
                {listing.imageUrl ? (
                  <img src={listing.imageUrl} alt="" className={localStyles.thumb} />
                ) : (
                  <div className={localStyles.thumbPlaceholder} />
                )}
                <div className={localStyles.itemBody}>
                  <div className={styles.itemTop}>
                    <div>
                      <h2>
                        <Link href={`/listings/${listing.id}`}>{listing.title || listing.id}</Link>
                      </h2>
                      <p className={styles.reason}>
                        {listing.locationLine} · ₪{listing.priceIls.toLocaleString("he-IL")}
                      </p>
                      <p className={styles.meta}>
                        <span className={localStyles.statusPill}>{listing.statusLabel}</span>
                        {countdown ? <span className={localStyles.countdown}> · {countdown}</span> : null}
                      </p>
                      <p className={styles.meta}>
                        מפרסם:{" "}
                        <Link href={adminUsersSearchUrl(listing.publisherEmail || listing.publisherId)}>
                          {listing.publisherEmail || listing.publisherDisplayName || listing.publisherId}
                        </Link>
                        {" · "}
                        עודכן {formatWhen(listing.updatedAt)}
                      </p>
                      {listing.moderationDraftNote ? (
                        <p className={localStyles.modNote}>{listing.moderationDraftNote}</p>
                      ) : null}
                    </div>
                  </div>
                  <div className={localStyles.actions}>
                    {(listing.status === "active" || listing.status === "pending_review") && (
                      <Link
                        href={consumerListingUrl(listing.id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={localStyles.linkBtn}
                      >
                        באתר
                      </Link>
                    )}
                    {canEdit ? (
                      <Link href={`/listings/${listing.id}`} className={localStyles.linkBtn}>
                        עריכה / טיפול
                      </Link>
                    ) : (
                      <Link href={`/listings/${listing.id}`} className={localStyles.linkBtn}>
                        פרטים
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function AdminListingsPage() {
  return (
    <Suspense fallback={<p className={styles.empty}>טוען…</p>}>
      <AdminListingsPageInner />
    </Suspense>
  );
}
