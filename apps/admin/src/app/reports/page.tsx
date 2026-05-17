"use client";

import {
  ADMIN_MODERATION_DRAFT_NOTE_MAX,
  DEFAULT_ADMIN_REPORT_FILTERS,
  filterAdminListingReports,
  LISTING_REPORT_STATUS_LABELS,
  LISTING_STATUS_LABEL_HE,
  REPORT_REASON_FILTER_OPTIONS,
  type AdminReportListFilters,
  type ListingReportRecord,
  type ListingReportStatus,
  type ListingStatus,
  type ReportReason,
} from "@lobby/shared";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminConfirmModal } from "@/components/AdminConfirmModal";
import { adminUsersSearchUrl, consumerListingUrl } from "@/lib/consumerUrls";
import {
  fetchAdminReports,
  moderateListingFromReport,
  updateAdminReportStatus,
} from "@/lib/firebase/functions";
import styles from "./reports.module.css";

type ModerationPending =
  | { type: "remove"; report: ListingReportRecord }
  | { type: "draft"; report: ListingReportRecord };

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

function personLine(label: string, name: string, email: string, id: string): string {
  const display = name.trim() || email.trim() || id || "—";
  const extra = email.trim() && email.trim() !== display ? ` · ${email}` : "";
  return `${label}: ${display}${extra}`;
}

function listingStatusLabel(status: string): string {
  if (!status) {
    return "";
  }
  return LISTING_STATUS_LABEL_HE[status as ListingStatus] ?? status;
}

export default function AdminReportsPage() {
  const [reports, setReports] = useState<ListingReportRecord[]>([]);
  const [filters, setFilters] = useState<AdminReportListFilters>(DEFAULT_ADMIN_REPORT_FILTERS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [pending, setPending] = useState<ModerationPending | null>(null);
  const [draftNote, setDraftNote] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const items = await fetchAdminReports();
      setReports(items);
    } catch {
      setReports([]);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const counts = useMemo(() => {
    let open = 0;
    for (const r of reports) {
      if (r.status !== "resolved") {
        open += 1;
      }
    }
    return { open, all: reports.length };
  }, [reports]);

  const filtered = useMemo(() => filterAdminListingReports(reports, filters), [reports, filters]);

  function patchReport(updated: ListingReportRecord) {
    setReports((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
  }

  async function setStatus(reportId: string, status: ListingReportStatus) {
    setBusyId(reportId);
    setToast(null);
    try {
      await updateAdminReportStatus(reportId, status);
      setReports((prev) => prev.map((r) => (r.id === reportId ? { ...r, status } : r)));
    } catch {
      setError(true);
      setToast("לא הצלחנו לעדכן את סטטוס הדיווח.");
    } finally {
      setBusyId(null);
    }
  }

  async function runModeration(action: "remove" | "return_to_draft", report: ListingReportRecord) {
    setBusyId(report.id);
    setToast(null);
    try {
      const updated = await moderateListingFromReport(
        report.id,
        action,
        action === "return_to_draft" ? draftNote : undefined,
      );
      patchReport(updated);
      setToast(
        action === "remove"
          ? "המודעה הוסרה מהפלטפורמה."
          : "המודעה הוחזרה לטיוטה והמפרסם קיבל הודעה.",
      );
      setPending(null);
      setDraftNote("");
    } catch {
      setError(true);
      setToast("הפעולה נכשלה. ודאו שה-Functions מפורסמות ונסו שוב.");
    } finally {
      setBusyId(null);
    }
  }

  function onActionSelect(report: ListingReportRecord, value: string) {
    if (!value) {
      return;
    }
    if (value === "in_progress") {
      void setStatus(report.id, "in_progress");
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
            {counts.open} פתוחים
            {counts.all !== counts.open ? ` · ${counts.all} סה״כ` : ""}
            {filtered.length !== counts.all ? ` · ${filtered.length} בתוצאות הסינון` : ""}
          </p>
        </div>
        <button type="button" className={styles.refreshBtn} disabled={loading} onClick={() => void load()}>
          רענון
        </button>
      </header>

      <section className={styles.toolbar} aria-label="סינון וחיפוש דיווחים">
        <div className={styles.toolbarRow}>
          <div className={styles.tabs} role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={filters.statusTab === "open"}
              className={filters.statusTab === "open" ? styles.tabOn : styles.tab}
              onClick={() => setFilters((f) => ({ ...f, statusTab: "open" }))}
            >
              פתוחים ({counts.open})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={filters.statusTab === "all"}
              className={filters.statusTab === "all" ? styles.tabOn : styles.tab}
              onClick={() => setFilters((f) => ({ ...f, statusTab: "all" }))}
            >
              הכל ({counts.all})
            </button>
          </div>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>מיון</span>
            <select
              className={styles.select}
              value={filters.sort}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  sort: e.target.value as AdminReportListFilters["sort"],
                }))
              }
            >
              <option value="newest">חדש → ישן</option>
              <option value="oldest">ישן → חדש</option>
            </select>
          </label>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>סוג דיווח</span>
            <select
              className={styles.select}
              value={filters.reason}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  reason: e.target.value as ReportReason | "",
                }))
              }
            >
              {REPORT_REASON_FILTER_OPTIONS.map((opt) => (
                <option key={opt.id || "all"} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className={styles.searchField}>
          <span className={styles.fieldLabel}>חיפוש</span>
          <input
            type="search"
            className={styles.searchInput}
            placeholder="מודעה, מייל, שם, מזהה משתמש, טקסט חופשי…"
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
          />
        </label>
      </section>

      {toast ? <p className={styles.toast}>{toast}</p> : null}

      {error ? (
        <p className={styles.error} role="alert">
          שגיאה בטעינה או בעדכון. נסו לרענן.
        </p>
      ) : null}

      {loading ? <p className={styles.empty}>טוען דיווחים…</p> : null}

      {!loading && filtered.length === 0 ? (
        <p className={styles.empty}>אין דיווחים בסינון הזה.</p>
      ) : null}

      <ul className={styles.list}>
        {filtered.map((report) => (
          <li key={report.id} className={styles.item}>
            <div className={styles.itemTop}>
              <div>
                <span className={styles.statusBadge} data-status={report.status}>
                  {LISTING_REPORT_STATUS_LABELS[report.status]}
                </span>
                <h2 className={styles.reasonTitle}>{report.reasonLabel}</h2>
                <Link
                  href={consumerListingUrl(report.listingId)}
                  className={styles.listingLink}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {report.listingTitle || report.listingId}
                </Link>
                {report.otherDetails ? (
                  <p className={styles.customerText}>
                    <span className={styles.customerTextLabel}>מה שדווח:</span> {report.otherDetails}
                  </p>
                ) : null}
                <ul className={styles.metaList}>
                  <li>
                    {personLine(
                      "מדווח",
                      report.reporterDisplayName ?? "",
                      report.reporterEmail ?? "",
                      report.reporterId,
                    )}
                  </li>
                  <li>
                    {personLine(
                      "מפרסם",
                      report.publisherDisplayName ?? "",
                      report.publisherEmail ?? "",
                      report.publisherId,
                    )}
                    {report.listingStatus ? (
                      <span className={styles.listingStatus}>
                        {" "}
                        · מודעה: {listingStatusLabel(report.listingStatus)}
                      </span>
                    ) : null}
                  </li>
                </ul>
                <div className={styles.quickLinks}>
                  <Link
                    href={adminUsersSearchUrl(report.publisherEmail || report.publisherId)}
                    className={styles.metaLink}
                  >
                    כרטיס מפרסם
                  </Link>
                  <Link
                    href={adminUsersSearchUrl(report.reporterEmail || report.reporterId)}
                    className={styles.metaLink}
                  >
                    כרטיס מדווח
                  </Link>
                </div>
              </div>
              <time className={styles.time}>{formatReportDate(report.createdAt)}</time>
            </div>

            <div className={styles.actionsRow}>
              <label className={styles.actionSelectWrap}>
                <span className={styles.srOnly}>פעולת טיפול</span>
                <select
                  className={styles.actionSelect}
                  disabled={busyId === report.id}
                  defaultValue=""
                  onChange={(e) => {
                    const value = e.target.value;
                    e.target.value = "";
                    onActionSelect(report, value);
                  }}
                >
                  <option value="">טיפול בדיווח…</option>
                  {report.status === "open" ? <option value="in_progress">סמן בטיפול</option> : null}
                  {report.status !== "resolved" ? (
                    <>
                      <option value="return_to_draft">החזר מודעה לטיוטה + הסבר</option>
                      <option value="remove">הסר מודעה מהפלטפורמה</option>
                      <option value="resolved">סגור דיווח (ללא שינוי מודעה)</option>
                    </>
                  ) : (
                    <option value="reopen">פתח דיווח מחדש</option>
                  )}
                </select>
              </label>
              <Link
                href={consumerListingUrl(report.listingId)}
                className={styles.viewListingBtn}
                target="_blank"
                rel="noopener noreferrer"
              >
                צפייה במודעה
              </Link>
            </div>
          </li>
        ))}
      </ul>

      <AdminConfirmModal
        open={pending?.type === "remove"}
        title="להסיר את המודעה מהפלטפורמה?"
        description={
          <p>
            המודעה «{pending?.report.listingTitle}» תוסתר מהפיד ותסומן כהוסרה. הדיווח ייסגר. המפרסם יקבל הודעה
            במערכת.
          </p>
        }
        confirmLabel="הסר מהפלטפורמה"
        danger
        busy={busyId !== null}
        onCancel={() => setPending(null)}
        onConfirm={() => pending?.type === "remove" && void runModeration("remove", pending.report)}
      />

      <AdminConfirmModal
        open={pending?.type === "draft"}
        title="להחזיר את המודעה לטיוטה?"
        description={
          <div>
            <p className={styles.modalLead}>
              המפרסם יראה את ההסבר באזור האישי ויוכל לערוך לפני פרסום מחדש. הדיווח ייסגר.
            </p>
            <label className={styles.draftField}>
              <span className={styles.fieldLabel}>הסבר למפרסם (חובה)</span>
              <textarea
                className={styles.draftTextarea}
                rows={4}
                maxLength={ADMIN_MODERATION_DRAFT_NOTE_MAX}
                value={draftNote}
                onChange={(e) => setDraftNote(e.target.value)}
                placeholder="למשל: יש לעדכן מחיר או להסיר פרטי תיווך מהתיאור…"
              />
              <span className={styles.charCount}>
                {draftNote.length}/{ADMIN_MODERATION_DRAFT_NOTE_MAX}
              </span>
            </label>
          </div>
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
          } else {
            setToast("יש לכתוב הסבר של לפחות 5 תווים.");
          }
        }}
      />
    </div>
  );
}