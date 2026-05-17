"use client";

import { useState } from "react";
import {
  REPORT_OTHER_DETAILS_MAX_CHARACTERS,
  REPORT_REASON_LABELS,
  type ReportReason,
} from "@lobby/shared";
import { useLobbyAuth } from "@/contexts/LobbyAuthContext";
import { isFirebaseConfigured } from "@/lib/firebase/isConfigured";
import { submitListingReport } from "@/lib/firebase/submitListingReport";
import styles from "./page.module.css";

const reportReasonOptions = Object.entries(REPORT_REASON_LABELS) as Array<[ReportReason, string]>;

interface ReportMenuProps {
  listingId: string;
  listingTitle: string;
}

export function ReportMenu({ listingId, listingTitle }: ReportMenuProps) {
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
      <button className={styles.reportButton} type="button" onClick={() => setIsOpen(true)}>
        דיווח
      </button>

      {isOpen ? (
        <div className={styles.reportOverlay} role="presentation" onClick={closeReportMenu}>
          <div
            className={styles.reportPanel}
            role="dialog"
            aria-modal="true"
            aria-label="דיווח על מודעה"
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.reportPanelHeader}>
              <button type="button" onClick={closeReportMenu} aria-label="סגירת דיווח">
                ×
              </button>
              <div>
                <h2>דיווח על מודעה</h2>
                <p>מה לא תקין במודעה הזאת?</p>
              </div>
            </div>

            <div className={styles.reportReasons}>
              {reportReasonOptions.map(([reason, label]) => (
                <button
                  key={reason}
                  className={selectedReason === reason ? styles.selectedReportReason : undefined}
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
              <label className={styles.reportOtherField}>
                <span>מה קרה בדיוק?</span>
                <textarea
                  maxLength={REPORT_OTHER_DETAILS_MAX_CHARACTERS}
                  value={otherDetails}
                  onChange={(event) => setOtherDetails(event.target.value)}
                  placeholder="כתבו בקצרה עד 100 תווים"
                />
                <small>
                  {otherDetails.length}/{REPORT_OTHER_DETAILS_MAX_CHARACTERS}
                </small>
              </label>
            ) : null}

            {feedback === "ok" ? (
              <p className={styles.reportSuccess}>הדיווח נשלח. תודה ששומרים על לובי נקייה.</p>
            ) : null}
            {feedback === "err" ? (
              <p className={styles.reportError}>לא הצלחנו לשלוח. נסו שוב או בדקו חיבור.</p>
            ) : null}

            <button
              className={styles.reportSubmit}
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
