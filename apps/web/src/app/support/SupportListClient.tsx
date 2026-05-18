"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  SUPPORT_INQUIRY_STATUS_LABELS,
  formatChatMessageTime,
  formatSupportInquiryReference,
  supportInquiryIsOpen,
} from "@lobby/shared";
import { useLobbyAuth } from "@/contexts/LobbyAuthContext";
import { listMySupportInquiries } from "@/lib/firebase/supportInquiry";
import { sortSupportInquiriesByUpdated, type SupportInquirySummary } from "@/lib/firebase/supportInquiryThread";
import { isFirebaseConfigured } from "@/lib/firebase/isConfigured";
import styles from "../chat/chat.module.css";

export function SupportListClient({ activeInquiryId }: { activeInquiryId?: string | null }) {
  const { user, loading, openAuthModal } = useLobbyAuth();
  const [inquiries, setInquiries] = useState<SupportInquirySummary[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user || !isFirebaseConfigured()) {
      setInquiries([]);
      return;
    }
    setListLoading(true);
    setListError(null);
    try {
      const rows = await listMySupportInquiries();
      const mapped: SupportInquirySummary[] = rows.map((row) => ({
        id: row.id,
        referenceNumber: row.referenceNumber,
        subject: row.subject,
        categoryLabel: row.categoryLabel,
        status: row.status,
        lastMessagePreview: row.lastMessagePreview,
        unreadForUser: row.unreadForUser,
        listingId: row.listingId,
        listingTitle: row.listingTitle,
        updatedAt: row.updatedAt,
        createdAt: row.createdAt,
        userResolvedAt: row.userResolvedAt ?? null,
      }));
      setInquiries(sortSupportInquiriesByUpdated(mapped));
    } catch {
      setListError("לא ניתן לטעון פניות. נסו שוב.");
      setInquiries([]);
    } finally {
      setListLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!isFirebaseConfigured()) {
    return (
      <div className={`${styles.shell} ${styles.shellPadded}`}>
        <p className={styles.muted}>אין חיבור ל־Firebase.</p>
        <Link href="/contact" className={styles.backLink}>
          פנייה חדשה
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={`${styles.shell} ${styles.shellPadded}`}>
        <p className={styles.muted}>טוען…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className={`${styles.shell} ${styles.shellPadded}`}>
        <p>כדי לראות פניות לתמיכה צריך להתחבר.</p>
        <button type="button" className={styles.ctaButton} onClick={openAuthModal}>
          כניסה / הרשמה
        </button>
      </div>
    );
  }

  return (
    <div className={styles.shell}>
      <div className={styles.listToolbar}>
        <h2 className={styles.listSectionTitle}>הפניות שלי</h2>
        <Link href="/contact" className={styles.backLink}>
          פנייה חדשה
        </Link>
      </div>

      {listLoading ? <p className={`${styles.muted} ${styles.listStatusPad}`}>טוען…</p> : null}
      {listError ? <p className={`${styles.listError} ${styles.listStatusPad}`}>{listError}</p> : null}

      {!listLoading && !listError && inquiries.length === 0 ? (
        <p className={`${styles.muted} ${styles.listStatusPad}`}>
          אין פניות עדיין.{" "}
          <Link href="/contact" className={styles.backLink}>
            צרו קשר
          </Link>
        </p>
      ) : null}

      <div className={styles.listScroll} role="region" aria-label="רשימת פניות">
        {inquiries.length > 0 ? (
          <ul className={styles.list}>
            {inquiries.map((inquiry) => {
              const active = activeInquiryId === inquiry.id;
              const unread = inquiry.unreadForUser ?? 0;
              const timeLabel = inquiry.updatedAt ? formatChatMessageTime(inquiry.updatedAt) : "";
              const statusLabel = SUPPORT_INQUIRY_STATUS_LABELS[inquiry.status];

              return (
                <li key={inquiry.id}>
                  <Link
                    href={`/support/${inquiry.id}`}
                    className={`${styles.listItem} ${active ? styles.listItemActive : ""}`}
                    aria-current={active ? "page" : undefined}
                  >
                    <div className={styles.listItemMain}>
                      <span className={styles.listItemTitle}>
                        {inquiry.subject || "פנייה לתמיכה"}
                      </span>
                      <span className={styles.listItemMeta}>
                        #{formatSupportInquiryReference(inquiry.referenceNumber)} · {statusLabel}
                      </span>
                      {inquiry.lastMessagePreview ? (
                        <span className={styles.listItemPreview}>{inquiry.lastMessagePreview}</span>
                      ) : null}
                    </div>
                    <div className={styles.listItemAside}>
                      {timeLabel ? <time className={styles.listItemTime}>{timeLabel}</time> : null}
                      {unread > 0 && supportInquiryIsOpen(inquiry.status) ? (
                        <span className={styles.unreadBadge} aria-label={`${unread} הודעות חדשות`}>
                          {unread > 99 ? "99+" : unread}
                        </span>
                      ) : null}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
