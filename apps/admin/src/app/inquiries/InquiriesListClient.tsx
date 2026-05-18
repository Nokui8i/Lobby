"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  DEFAULT_SUPPORT_INQUIRY_FILTERS,
  SUPPORT_INQUIRY_CATEGORIES,
  SUPPORT_INQUIRY_CATEGORY_LABELS,
  SUPPORT_INQUIRY_STATUSES,
  SUPPORT_INQUIRY_STATUS_LABELS,
  filterAdminSupportInquiries,
  formatChatMessageTime,
  formatSupportInquiryReference,
  sortSupportInquiriesForStaff,
  type SupportInquiryCategory,
  type SupportInquiryRecord,
  type SupportInquiryStatus,
} from "@lobby/shared";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { fetchAdminSupportInquiries } from "@/lib/firebase/functions";
import { ensureAdminFirestoreAuthReady, getFirestoreDb } from "@/lib/firebase/client";
import { isFirebaseConfigured } from "@/lib/firebase/isConfigured";
import { subscribeAdminSupportInquiries } from "@/lib/firebase/supportInquiryThread";
import styles from "./inquiriesChat.module.css";

export function InquiriesListClient({ activeInquiryId }: { activeInquiryId?: string | null }) {
  const { user } = useAdminAuth();
  const [inquiries, setInquiries] = useState<SupportInquiryRecord[]>([]);
  const [filters, setFilters] = useState(DEFAULT_SUPPORT_INQUIRY_FILTERS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!user || !isFirebaseConfigured()) {
      setInquiries([]);
      setLoading(false);
      setError(false);
      return;
    }

    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    void (async () => {
      try {
        await ensureAdminFirestoreAuthReady(user);
      } catch {
        if (!cancelled) {
          setError(true);
          setLoading(false);
        }
        return;
      }

      if (cancelled) {
        return;
      }

      setLoading(true);
      setError(false);

      unsubscribe = subscribeAdminSupportInquiries(
        getFirestoreDb(),
        (rows) => {
          if (!cancelled) {
            setInquiries(rows);
            setLoading(false);
            setError(false);
          }
        },
        () => {
          if (!cancelled) {
            setInquiries([]);
            setError(true);
            setLoading(false);
          }
        },
      );
    })();

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [user]);

  const filtered = useMemo(() => {
    const rows = filterAdminSupportInquiries(inquiries, filters);
    return [...rows].sort(sortSupportInquiriesForStaff);
  }, [inquiries, filters]);

  return (
    <div className={styles.shell}>
      <div className={styles.listToolbar}>
        <h2 className={styles.listTitle}>פניות תמיכה</h2>
        <div className={styles.listFilters}>
          <select
            value={filters.status}
            aria-label="סטטוס"
            onChange={(e) =>
              setFilters((f) => ({ ...f, status: e.target.value as SupportInquiryStatus | "all" }))
            }
          >
            <option value="all">כל הסטטוסים</option>
            {SUPPORT_INQUIRY_STATUSES.map((s) => (
              <option key={s} value={s}>
                {SUPPORT_INQUIRY_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
          <select
            value={filters.category}
            aria-label="קטגוריה"
            onChange={(e) =>
              setFilters((f) => ({ ...f, category: e.target.value as SupportInquiryCategory | "all" }))
            }
          >
            <option value="all">כל הקטגוריות</option>
            {SUPPORT_INQUIRY_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {SUPPORT_INQUIRY_CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
          <input
            type="search"
            placeholder="חיפוש…"
            aria-label="חיפוש"
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
          />
          <button
            type="button"
            className={styles.btn}
            disabled={loading}
            onClick={() => {
              void fetchAdminSupportInquiries()
                .then(setInquiries)
                .catch(() => setError(true));
            }}
          >
            רענון
          </button>
        </div>
      </div>

      {error ? <p className={styles.sendError}>שגיאה בטעינה</p> : null}
      {loading ? <p className={styles.muted}>טוען…</p> : null}

      <div className={styles.listScroll}>
        {!loading && filtered.length === 0 ? <p className={styles.muted}>אין פניות.</p> : null}
        <ul className={styles.list}>
          {filtered.map((inquiry) => {
            const active = activeInquiryId === inquiry.id;
            const unread = inquiry.unreadForStaff ?? 0;
            const timeLabel = inquiry.updatedAt ? formatChatMessageTime(inquiry.updatedAt) : "";

            return (
              <li key={inquiry.id}>
                <Link
                  href={`/inquiries/${inquiry.id}`}
                  className={`${styles.threadCard} ${active ? styles.threadCardActive : ""} ${unread > 0 ? styles.threadCardUnread : ""}`}
                  aria-current={active ? "page" : undefined}
                >
                  <div className={styles.threadCardRow}>
                    <div>
                      <div className={styles.threadTitleRow}>
                        {unread > 0 ? <span className={styles.threadUnreadDot} aria-hidden /> : null}
                        <strong>{inquiry.subject}</strong>
                      </div>
                      <p className={styles.threadMeta}>
                        #{formatSupportInquiryReference(inquiry.referenceNumber)} ·{" "}
                        {SUPPORT_INQUIRY_STATUS_LABELS[inquiry.status]}
                        {inquiry.assignedToDisplayName ? ` · ${inquiry.assignedToDisplayName}` : ""}
                      </p>
                      {inquiry.lastMessagePreview ? (
                        <p className={styles.threadPreview}>{inquiry.lastMessagePreview}</p>
                      ) : null}
                    </div>
                    <div>
                      {timeLabel ? <span className={styles.threadTime}>{timeLabel}</span> : null}
                      {unread > 0 ? (
                        <span className={styles.unreadBadge} aria-label={`${unread} חדשות`}>
                          {unread > 99 ? "99+" : unread}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
