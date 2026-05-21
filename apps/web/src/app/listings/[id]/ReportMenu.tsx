"use client";

import { useState } from "react";
import {
  REPORT_OTHER_DETAILS_MAX_CHARACTERS,
  REPORT_REASON_LABELS,
  type ReportReason,
} from "@lobby/shared";
import { bubble } from "@/components/bubble/styles";
import { useLobbyAuth } from "@/contexts/LobbyAuthContext";
import { isFirebaseConfigured } from "@/lib/firebase/isConfigured";
import { submitListingReport } from "@/lib/firebase/submitListingReport";
import { cn } from "@/lib/utils";

const reportReasonOptions = Object.entries(REPORT_REASON_LABELS) as Array<[ReportReason, string]>;

interface ReportMenuProps {
  listingId: string;
  listingTitle: string;
  /** בתחתית כרטיס המודעה — כפתור ברוחב מלא */
  variant?: "default" | "cardFooter";
}

export function ReportMenu({ listingId, listingTitle, variant = "default" }: ReportMenuProps) {
  const { user, openAuthModal } = useLobbyAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedReason, setSelectedReason] = useState<ReportReason | null>(null);
  const [otherDetails, setOtherDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<"ok" | "err" | null>(null);
  const isOtherReason = selectedReason === "other";
  const canSubmit = Boolean(selectedReason) && (!isOtherReason || otherDetails.trim().length > 0);

  const closeReportMenu = () => {
    setIsOpen(false);
    setSelectedReason(null);
    setOtherDetails("");
    setFeedback(null);
  };

  async function handleSubmit() {
    if (!selectedReason || !canSubmit) {
      return;
    }

    if (!isFirebaseConfigured()) {
      setFeedback("err");
      return;
    }

    if (!user) {
      openAuthModal();
      return;
    }

    setSubmitting(true);
    setFeedback(null);

    try {
      await submitListingReport({
        listingId,
        listingTitle,
        reporterId: user.uid,
        reason: selectedReason,
        otherDetails: isOtherReason ? otherDetails.trim() : undefined,
      });
      setFeedback("ok");
      setTimeout(() => closeReportMenu(), 1400);
    } catch {
      setFeedback("err");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button
        className={cn(
          variant === "cardFooter"
            ? "w-full rounded-xl border border-slate-200/90 bg-white py-2.5 text-sm font-semibold text-graphite shadow-bubble transition hover:border-brand/25 hover:bg-soft hover:shadow-[0_4px_14px_rgba(15,23,42,0.08)]"
            : "rounded-xl border border-slate-200/90 bg-white px-4 py-2 text-sm font-bold text-graphite shadow-bubble transition hover:bg-soft",
        )}
        type="button"
        onClick={() => setIsOpen(true)}
      >
        {variant === "cardFooter" ? "דיווח על המודעה" : "דיווח"}
      </button>

      {isOpen ? (
        <div
          className="fixed inset-0 z-[100] grid place-items-center bg-[#101820]/30 p-4 backdrop-blur-sm"
          role="presentation"
          onClick={closeReportMenu}
        >
          <div
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-[20px] bg-white p-5 shadow-[14px_17px_40px_4px_rgba(112,144,176,0.12)] direction-rtl"
            role="dialog"
            aria-modal="true"
            aria-label="דיווח על מודעה"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex flex-row-reverse items-start justify-between gap-3">
              <button
                type="button"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-0 bg-[#F5FAFC] text-xl leading-none text-[graphite]"
                onClick={closeReportMenu}
                aria-label="סגירת דיווח"
              >
                ×
              </button>
              <div className="text-right">
                <h2 className={cn("m-0 text-lg", bubble.heading)}>דיווח על מודעה</h2>
                <p className="mt-1 mb-0 text-sm text-[#a3aed0]">מה לא תקין במודעה הזאת?</p>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              {reportReasonOptions.map(([reason, label]) => (
                <button
                  key={reason}
                  className={cn(
                    "w-full rounded-xl border px-3 py-2.5 text-right text-sm font-bold transition",
                    selectedReason === reason
                      ? "border-[brand] bg-[#E8F4F8] text-[brand]"
                      : "border-[#e9edf7] bg-white text-[graphite] hover:bg-[#F5FAFC]",
                  )}
                  type="button"
                  onClick={() => {
                    setSelectedReason(reason);

                    if (reason !== "other") {
                      setOtherDetails("");
                    }
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {isOtherReason ? (
              <label className="mt-4 flex flex-col gap-1.5 text-right">
                <span className={bubble.label}>מה קרה בדיוק?</span>
                <textarea
                  className={cn(bubble.input, "min-h-[88px] resize-y")}
                  maxLength={REPORT_OTHER_DETAILS_MAX_CHARACTERS}
                  value={otherDetails}
                  onChange={(event) => setOtherDetails(event.target.value)}
                  placeholder="כתבו בקצרה עד 100 תווים"
                />
                <small className="text-xs text-[#a3aed0]">
                  {otherDetails.length}/{REPORT_OTHER_DETAILS_MAX_CHARACTERS}
                </small>
              </label>
            ) : null}

            {feedback === "ok" ? (
              <p className="mt-3 text-sm font-bold text-[#065a63]">הדיווח נשלח. תודה ששומרים על לובי נקייה.</p>
            ) : null}
            {feedback === "err" ? (
              <p className="mt-3 text-sm font-bold text-red-700">לא הצלחנו לשלוח. נסו שוב או בדקו חיבור.</p>
            ) : null}

            <button
              className={cn(bubble.btnPrimary, "mt-4 w-full")}
              type="button"
              disabled={!canSubmit || submitting}
              onClick={() => void handleSubmit()}
            >
              {submitting ? "שולחים…" : "שליחת דיווח"}
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
