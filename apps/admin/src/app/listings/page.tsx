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
import { ap } from "@/lib/admin-page-classes";
import { lp } from "@/lib/admin-page-classes";

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
    <div className={ap.page}>
      <header className={ap.header}>
        <div>
          <Link href="/" className={ap.back}>
            ← לוח בקרה
          </Link>
          <h1 className={ap.title}>מודעות</h1>
          <p className={ap.sub}>
            {listings.length} תוצאות
            {activeCount > 0 ? ` · ${activeCount} בלוח / מוקפאות` : ""}
          </p>
        </div>
        <button type="button" className={ap.refreshBtn} disabled={loading} onClick={() => void load()}>
          רענון
        </button>
      </header>

      <form
        className={ap.filters}
        onSubmit={(e) => {
          e.preventDefault();
          void load();
        }}
      >
        <select
          className={ap.select}
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
          className={ap.searchInput}
          placeholder="חיפוש כותרת, עיר, מזהה…"
          aria-label="חיפוש"
          value={filters.search}
          onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
        />
        <input
          type="search"
          className={ap.searchInput}
          placeholder="מזהה מודעה"
          aria-label="מזהה מודעה"
          value={filters.listingId}
          onChange={(e) => setFilters((f) => ({ ...f, listingId: e.target.value }))}
        />
        <input
          type="search"
          className={ap.searchInput}
          placeholder="מזהה מפרסם"
          aria-label="מזהה מפרסם"
          value={filters.publisherId}
          onChange={(e) => setFilters((f) => ({ ...f, publisherId: e.target.value }))}
        />
        <button type="submit" className={ap.refreshBtn}>
          חיפוש
        </button>
      </form>

      {error ? <p className={ap.error}>שגיאה בטעינה. נסו לרענן.</p> : null}
      {loading ? <p className={ap.empty}>טוען…</p> : null}
      {!loading && listings.length === 0 ? <p className={ap.empty}>לא נמצאו מודעות.</p> : null}

      <ul className={ap.list}>
        {listings.map((listing) => {
          const countdown = countdownForRow(listing);
          return (
            <li key={listing.id} className={ap.item}>
              <div className={lp.itemRow}>
                {listing.imageUrl ? (
                  <img src={listing.imageUrl} alt="" className={lp.thumb} />
                ) : (
                  <div className={lp.thumbPlaceholder} />
                )}
                <div className={lp.itemBody}>
                  <div className={ap.itemTop}>
                    <div>
                      <h2 className="text-base font-semibold">
                        <Link href={`/listings/${listing.id}`}>{listing.title || listing.id}</Link>
                      </h2>
                      <p className={ap.reason}>
                        {listing.locationLine} · ₪{listing.priceIls.toLocaleString("he-IL")}
                      </p>
                      <p className={ap.meta}>
                        <span className={lp.statusPill}>{listing.statusLabel}</span>
                        {countdown ? <span className={lp.countdown}> · {countdown}</span> : null}
                      </p>
                      <p className={ap.meta}>
                        מפרסם:{" "}
                        <Link href={adminUsersSearchUrl(listing.publisherEmail || listing.publisherId)}>
                          {listing.publisherEmail || listing.publisherDisplayName || listing.publisherId}
                        </Link>
                        {" · "}
                        עודכן {formatWhen(listing.updatedAt)}
                      </p>
                      {listing.moderationDraftNote ? (
                        <p className={lp.modNote}>{listing.moderationDraftNote}</p>
                      ) : null}
                    </div>
                  </div>
                  <div className={lp.actions}>
                    {(listing.status === "active" || listing.status === "pending_review") && (
                      <Link
                        href={consumerListingUrl(listing.id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={lp.linkBtn}
                      >
                        באתר
                      </Link>
                    )}
                    {canEdit ? (
                      <Link href={`/listings/${listing.id}`} className={lp.linkBtn}>
                        עריכה / טיפול
                      </Link>
                    ) : (
                      <Link href={`/listings/${listing.id}`} className={lp.linkBtn}>
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
    <Suspense fallback={<p className={ap.empty}>טוען…</p>}>
      <AdminListingsPageInner />
    </Suspense>
  );
}
