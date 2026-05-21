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
import { cn } from "@/lib/utils";

const shell = "flex h-full min-h-0 flex-1 flex-col bg-white";
const shellPadded = "px-5 py-7";

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
      <div className={cn(shell, shellPadded)}>
        <p className="font-bold text-[#a3aed0]">אין חיבור ל־Firebase.</p>
        <Link href="/contact" className={cn("font-extrabold text-graphite hover:underline")}>
          פנייה חדשה
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={cn(shell, shellPadded)}>
        <p className="font-bold text-[#a3aed0]">טוען…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className={cn(shell, shellPadded)}>
        <p className="text-graphite">כדי לראות פניות לתמיכה צריך להתחבר.</p>
        <button
          type="button"
          className="btn-puffy mt-3 rounded-full px-5 py-3 text-sm font-semibold"
          onClick={openAuthModal}
        >
          כניסה / הרשמה
        </button>
      </div>
    );
  }

  return (
    <div className={shell}>
      <div className="shrink-0 border-b border-graphite/5 bg-soft/30 px-5 pb-2 pt-4">
        <h2 className="m-0 text-base font-black text-graphite">הפניות שלי</h2>
        <Link href="/contact" className="mt-1 inline-block text-sm font-extrabold text-graphite hover:underline">
          פנייה חדשה
        </Link>
      </div>

      {listLoading ? <p className="px-5 py-3 text-sm font-bold text-[#a3aed0]">טוען…</p> : null}
      {listError ? (
        <p className="mx-5 my-3 rounded-[14px] bg-red-500/10 px-3 py-2.5 text-sm font-bold text-[#a21e2e]">{listError}</p>
      ) : null}

      {!listLoading && !listError && inquiries.length === 0 ? (
        <p className="px-5 py-3 text-sm font-bold text-[#a3aed0]">
          אין פניות עדיין.{" "}
          <Link href="/contact" className="font-extrabold text-graphite hover:underline">
            צרו קשר
          </Link>
        </p>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto pb-4" role="region" aria-label="רשימת פניות">
        {inquiries.length > 0 ? (
          <ul className="m-0 flex list-none flex-col p-0">
            {inquiries.map((inquiry) => {
              const active = activeInquiryId === inquiry.id;
              const unread = inquiry.unreadForUser ?? 0;
              const timeLabel = inquiry.updatedAt ? formatChatMessageTime(inquiry.updatedAt) : "";
              const statusLabel = SUPPORT_INQUIRY_STATUS_LABELS[inquiry.status];

              return (
                <li key={inquiry.id}>
                  <Link
                    href={`/support/${inquiry.id}`}
                    className={cn(
                      "flex min-h-[72px] items-start justify-between gap-3 border-b border-[#e9edf7] px-5 py-3.5 text-inherit no-underline transition hover:bg-[#F5FAFC]",
                      active && "border-e-[3px] border-e-brand bg-brand/5",
                    )}
                    aria-current={active ? "page" : undefined}
                  >
                    <div className="min-w-0 flex-1">
                      <span className="block text-[15px] font-bold text-graphite">
                        {inquiry.subject || "פנייה לתמיכה"}
                      </span>
                      <span className="mt-1 block text-xs text-[#a3aed0]">
                        #{formatSupportInquiryReference(inquiry.referenceNumber)} · {statusLabel}
                      </span>
                      {inquiry.lastMessagePreview ? (
                        <span className="mt-1 line-clamp-2 block text-[13px] font-medium text-[#5c6670]">
                          {inquiry.lastMessagePreview}
                        </span>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      {timeLabel ? (
                        <time className="text-[11px] font-bold whitespace-nowrap text-[#8b949b]">{timeLabel}</time>
                      ) : null}
                      {unread > 0 && supportInquiryIsOpen(inquiry.status) ? (
                        <span
                          className="min-w-5 rounded-full bg-[#e63946] px-1.5 text-center text-[11px] font-black leading-5 text-white"
                          aria-label={`${unread} הודעות חדשות`}
                        >
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
