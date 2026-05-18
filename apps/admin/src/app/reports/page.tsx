"use client";

import {
  ADMIN_MODERATION_DRAFT_NOTE_MAX,
  DEFAULT_ADMIN_REPORT_FILTERS,
  filterAdminListingReports,
  REPORT_REASON_FILTER_OPTIONS,
  type AdminReportListFilters,
  type AdminPendingListingRecord,
  type ListingReportRecord,
  type ListingReportStatus,
  type ReportReason,
} from "@lobby/shared";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminConfirmModal } from "@/components/AdminConfirmModal";
import { adminUsersSearchUrl, consumerListingUrl } from "@/lib/consumerUrls";
import {
  decideAdminPendingListing,
  fetchAdminPendingListings,
  fetchAdminReports,
  moderateListingFromReport,
  updateAdminReportStatus,
} from "@/lib/firebase/functions";
import styles from "./reports.module.css";

type ModerationPending =
  | { type: "remove"; report: ListingReportRecord }
  | { type: "draft"; report: ListingReportRecord };

type PendingListingAction =
  | { type: "approve"; listing: AdminPendingListingRecord }
  | { type: "reject"; listing: AdminPendingListingRecord };

function formatReportDate(iso: string): string {
  if (!iso) {
    return "—";
  }
  try {
    return new Intl.DateTimeFormat("he-IL", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return "—";
  }
}

export default function AdminReportsPage() {
  const [reports, setReports] = useState<ListingReportRecord[]>([]);
  const [pendingListings, setPendingListings] = useState<AdminPendingListingRecord[]>([]);
  const [filters, setFilters] = useState<AdminReportListFilters>(DEFAULT_ADMIN_REPORT_FILTERS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pending, setPending] = useState<ModerationPending | null>(null);
  const [pendingListingAction, setPendingListingAction] = useState<PendingListingAction | null>(null);
  const [draftNote, setDraftNote] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const [items, pending] = await Promise.all([fetchAdminReports(), fetchAdminPendingListings()]);
      setReports(items);
      setPendingListings(pending);
    } catch {
      setReports([]);
      setPendingListings([]);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openCount = useMemo(
    () => reports.filter((r) => r.status !== "resolved").length,
    [reports],
  );

  const filtered = useMemo(() => filterAdminListingReports(reports, filters), [reports, filters]);

  function patchReport(updated: ListingReportRecord) {
    setReports((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
  }

  async function setStatus(reportId: string, status: ListingReportStatus) {
    setBusyId(reportId);
    try {
      await updateAdminReportStatus(reportId, status);
      setReports((prev) => prev.map((r) => (r.id === reportId ? { ...r, status } : r)));
    } catch {
      setError(true);
    } finally {
      setBusyId(null);
    }
  }

  async function runPendingDecision(
    decision: "approve" | "reject",
    listing: AdminPendingListingRecord,
    rejectNote?: string,
  ) {
    setBusyId(listing.id);
    try {
      await decideAdminPendingListing(listing.id, decision, rejectNote);
      setPendingListings((prev) => prev.filter((l) => l.id !== listing.id));
      setPendingListingAction(null);
      setDraftNote("");
    } catch {
      setError(true);
    } finally {
      setBusyId(null);
    }
  }

  async function runModeration(action: "remove" | "return_to_draft", report: ListingReportRecord) {
    setBusyId(report.id);
    try {
      const updated = await moderateListingFromReport(
        report.id,
        action,
        action === "return_to_draft" ? draftNote : undefined,
      );
      patchReport(updated);
      setPending(null);
      setDraftNote("");
    } catch {
      setError(true);
    } finally {
      setBusyId(null);
    }
  }

  function onActionSelect(report: ListingReportRecord, value: string) {
    if (!value) {
      return;
    }
    if (value === "resolved") {
      void setStatus(report.id, "resolved");
      return;
    }
    if (value === "reopen") {
      void setStatus(report.id, "open");
      return;
    }
    if (value === "remove") {
      setPending({ type: "remove", report });
      return;
    }
    if (value === "return_to_draft") {
      setDraftNote("");
      setPending({ type: "draft", report });
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <Link href="/" className={styles.back}>
            ← לוח בקרה
          </Link>
          <h1>דיווחים</h1>
          <p className={styles.sub}>
            {openCount} פתוחים · {reports.length} סה״כ
          </p>
        </div>
        <button type="button" className={styles.refreshBtn} disabled={loading} onClick={() => void load()}>
          רענון
        </button>
      </header>

      {pendingListings.length > 0 ? (
        <section className={styles.pendingSection}>
          <h2 className={styles.pendingTitle}>ממתינות לאישור אחרי תיקון ({pendingListings.length})</h2>
          <ul className={styles.pendingList}>
            {pendingListings.map((listing) => (
              <li key={listing.id} className={styles.pendingItem}>
                <div>
                  <Link
                    href={consumerListingUrl(listing.id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.pendingLink}
                  >
                    {listing.title}
                  </Link>
                  <p className={styles.pendingMeta}>
                    נשלח לבדיקה: {formatReportDate(listing.resubmittedAt)} · נותרו כ־
                    {listing.publishRemainingDays} ימי פרסום
                  </p>
                </div>
                <div className={styles.pendingActions}>
                  <button
                    type="button"
                    className={styles.approveBtn}
                    disabled={busyId !== null}
                    onClick={() => setPendingListingAction({ type: "approve", listing })}
                  >
                    אישור ללוח
                  </button>
                  <button
                    type="button"
                    className={styles.rejectBtn}
                    disabled={busyId !== null}
                    onClick={() => {
                      setDraftNote("");
                      setPendingListingAction({ type: "reject", listing });
                    }}
                  >
                    דחייה + הסבר
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className={styles.filters}>
        <button
          type="button"
          className={filters.statusTab === "open" ? styles.filterOn : styles.filter}
          onClick={() => setFilters((f) => ({ ...f, statusTab: "open" }))}
        >
          פתוחים
        </button>
        <button
          type="button"
          className={filters.statusTab === "all" ? styles.filterOn : styles.filter}
          onClick={() => setFilters((f) => ({ ...f, statusTab: "all" }))}
        >
          הכל
        </button>
        <select
          className={styles.select}
          value={filters.sort}
          aria-label="מיון"
          onChange={(e) =>
            setFilters((f) => ({ ...f, sort: e.target.value as AdminReportListFilters["sort"] }))
          }
        >
          <option value="newest">חדש לישן</option>
          <option value="oldest">ישן לחדש</option>
        </select>
        <select
          className={styles.select}
          value={filters.reason}
          aria-label="סוג דיווח"
          onChange={(e) =>
            setFilters((f) => ({ ...f, reason: e.target.value as ReportReason | "" }))
          }
        >
          {REPORT_REASON_FILTER_OPTIONS.map((opt) => (
            <option key={opt.id || "all"} value={opt.id}>
              {opt.label}
            </option>
          ))}
        </select>
        <input
          type="search"
          className={styles.searchInput}
          placeholder="חיפוש…"
          aria-label="חיפוש"
          value={filters.search}
          onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
        />
      </div>

      {error ? <p className={styles.error}>שגיאה בטעינה או בעדכון. נסו לרענן.</p> : null}
      {loading ? <p className={styles.empty}>טוען…</p> : null}
      {!loading && filtered.length === 0 ? <p className={styles.empty}>אין דיווחים.</p> : null}

      <ul className={styles.list}>
        {filtered.map((report) => (
          <li key={report.id} className={styles.item}>
            <div className={styles.itemTop}>
              <div>
                <h2>
                  <Link
                    href={consumerListingUrl(report.listingId)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {report.listingTitle || report.listingId}
                  </Link>
                </h2>
                <p className={styles.reason}>{report.reasonLabel}</p>
                {report.otherDetails ? <p className={styles.other}>{report.otherDetails}</p> : null}
                <p className={styles.meta}>
                  מדווח:{" "}
                  <Link href={adminUsersSearchUrl(report.reporterEmail || report.reporterId)}>
                    {report.reporterEmail || report.reporterId || "—"}
                  </Link>
                  {" · "}
                  מפרסם:{" "}
                  <Link href={adminUsersSearchUrl(report.publisherEmail || report.publisherId)}>
                    {report.publisherEmail || report.publisherId || "—"}
                  </Link>
                </p>
              </div>
              <time className={styles.time}>{formatReportDate(report.createdAt)}</time>
            </div>

            <select
              className={styles.actionSelect}
              disabled={busyId === report.id}
              defaultValue=""
              aria-label="פעולה"
              onChange={(e) => {
                const value = e.target.value;
                e.target.value = "";
                onActionSelect(report, value);
              }}
            >
              <option value="">טיפול…</option>
              {report.status !== "resolved" ? (
                <>
                  <option value="return_to_draft">החזר מודעה לטיוטה</option>
                  <option value="remove">הסר מודעה</option>
                  <option value="resolved">סגור דיווח</option>
                </>
              ) : (
                <option value="reopen">פתח מחדש</option>
              )}
            </select>
          </li>
        ))}
      </ul>

      <AdminConfirmModal
        open={pendingListingAction?.type === "approve"}
        title="לאשר חזרה ללוח?"
        description={
          <p>
            המודעה תחזור לפיד עם זמן הפרסום שנשמר (כ־
            {pendingListingAction?.type === "approve"
              ? pendingListingAction.listing.publishRemainingDays
              : "—"}{" "}
            ימים).
          </p>
        }
        confirmLabel="אישור"
        busy={busyId !== null}
        onCancel={() => setPendingListingAction(null)}
        onConfirm={() => {
          if (pendingListingAction?.type === "approve") {
            void runPendingDecision("approve", pendingListingAction.listing);
          }
        }}
      />

      <AdminConfirmModal
        open={pendingListingAction?.type === "reject"}
        title="לדחות ולבקש תיקון?"
        description={
          <label className={styles.draftField}>
            <span className={styles.draftLabel}>הסבר למפרסם</span>
            <textarea
              className={styles.draftTextarea}
              rows={4}
              maxLength={ADMIN_MODERATION_DRAFT_NOTE_MAX}
              value={draftNote}
              onChange={(e) => setDraftNote(e.target.value)}
            />
          </label>
        }
        confirmLabel="דחייה"
        danger
        busy={busyId !== null}
        onCancel={() => {
          setPendingListingAction(null);
          setDraftNote("");
        }}
        onConfirm={() => {
          if (pendingListingAction?.type === "reject" && draftNote.trim().length >= 5) {
            void runPendingDecision("reject", pendingListingAction.listing, draftNote);
          }
        }}
      />

      <AdminConfirmModal
        open={pending?.type === "remove"}
        title="להסיר את המודעה?"
        description={<p>המודעה תוסר מהפלטפורמה והדיווח ייסגר.</p>}
        confirmLabel="הסר"
        danger
        busy={busyId !== null}
        onCancel={() => setPending(null)}
        onConfirm={() => pending?.type === "remove" && void runModeration("remove", pending.report)}
      />

      <AdminConfirmModal
        open={pending?.type === "draft"}
        title="להחזיר לטיוטה?"
        description={
          <label className={styles.draftField}>
            <span className={styles.draftLabel}>הסבר למפרסם</span>
            <textarea
              className={styles.draftTextarea}
              rows={4}
              maxLength={ADMIN_MODERATION_DRAFT_NOTE_MAX}
              value={draftNote}
              onChange={(e) => setDraftNote(e.target.value)}
            />
          </label>
        }
        confirmLabel="החזר לטיוטה"
        busy={busyId !== null}
        onCancel={() => {
          setPending(null);
          setDraftNote("");
        }}
        onConfirm={() => {
          if (pending?.type === "draft" && draftNote.trim().length >= 5) {
            void runModeration("return_to_draft", pending.report);
          }
        }}
      />
    </div>
  );
}