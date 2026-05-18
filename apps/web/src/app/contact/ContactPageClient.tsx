"use client";

import { useEffect, useMemo, useState } from "react";
import {
  SUPPORT_INQUIRY_BODY_MAX,
  SUPPORT_INQUIRY_CATEGORIES,
  SUPPORT_INQUIRY_CATEGORY_LABELS,
  SUPPORT_INQUIRY_SUBJECT_MAX,
  type SupportInquiryCategory,
} from "@lobby/shared";
import { useRouter, useSearchParams } from "next/navigation";
import { useLobbyAuth } from "@/contexts/LobbyAuthContext";
import { fetchListingByIdFromFirestore } from "@/lib/firebase/listingQueries";
import { isFirebaseConfigured } from "@/lib/firebase/isConfigured";
import { buildSupportChatRouteId } from "@lobby/shared";
import { submitSupportInquiry } from "@/lib/firebase/supportInquiry";
import styles from "./contact.module.css";

const categoryOptions = SUPPORT_INQUIRY_CATEGORIES.map((id) => ({
  id,
  label: SUPPORT_INQUIRY_CATEGORY_LABELS[id],
}));

export function ContactPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const listingIdFromUrl = searchParams.get("listingId")?.trim() ?? "";
  const { user, openAuthModal } = useLobbyAuth();

  const [category, setCategory] = useState<SupportInquiryCategory>("technical");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [listingTitle, setListingTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!listingIdFromUrl || !isFirebaseConfigured()) {
      return;
    }
    let cancelled = false;
    void fetchListingByIdFromFirestore(listingIdFromUrl).then((listing) => {
      if (!cancelled && listing) {
        setListingTitle(listing.title);
        setCategory("listing");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [listingIdFromUrl]);

  const canSubmit = useMemo(() => {
    return subject.trim().length >= 2 && body.trim().length >= 10 && !submitting;
  }, [subject, body, submitting]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!isFirebaseConfigured()) {
      setError("המערכת לא מחוברת כרגע. נסו שוב מאוחר יותר.");
      return;
    }

    if (!user) {
      openAuthModal();
      return;
    }

    setSubmitting(true);
    try {
      const result = await submitSupportInquiry({
        category,
        subject: subject.trim(),
        body: body.trim(),
        listingId: listingIdFromUrl || undefined,
        listingTitle: listingTitle.trim() || undefined,
      });
      router.push(`/chat/${buildSupportChatRouteId(result.inquiryId)}`);
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "message" in err && typeof err.message === "string"
          ? err.message
          : "לא הצלחנו לשלוח את הפנייה. נסו שוב.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  if (!user) {
    return (
      <div className={styles.authPrompt}>
        <p>כדי לשלוח פנייה לתמיכה יש להתחבר לחשבון Lobby.</p>
        <button type="button" className={styles.authBtn} onClick={openAuthModal}>
          התחברות / הרשמה
        </button>
      </div>
    );
  }

  return (
    <form className={styles.form} autoComplete="off" onSubmit={(e) => void handleSubmit(e)}>
      {listingTitle ? (
        <p className={styles.hint}>הפנייה תקושר למודעה: {listingTitle}</p>
      ) : null}

      <div className={styles.field}>
        <label htmlFor="inquiry-category">קטגוריה</label>
        <select
          id="inquiry-category"
          name="lobby-inquiry-category"
          autoComplete="off"
          value={category}
          onChange={(e) => setCategory(e.target.value as SupportInquiryCategory)}
        >
          {categoryOptions.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.field}>
        <label htmlFor="inquiry-subject">נושא</label>
        <input
          id="inquiry-subject"
          name="lobby-inquiry-subject"
          type="text"
          autoComplete="off"
          data-lpignore="true"
          data-1p-ignore
          value={subject}
          maxLength={SUPPORT_INQUIRY_SUBJECT_MAX}
          onChange={(e) => setSubject(e.target.value)}
          required
        />
      </div>

      <div className={styles.field}>
        <label htmlFor="inquiry-body">פרטים</label>
        <textarea
          id="inquiry-body"
          name="lobby-inquiry-body"
          autoComplete="off"
          data-lpignore="true"
          data-1p-ignore
          value={body}
          maxLength={SUPPORT_INQUIRY_BODY_MAX}
          onChange={(e) => setBody(e.target.value)}
          required
        />
        <p className={styles.hint}>מינימום 10 תווים</p>
      </div>

      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}

      <div className={styles.actions}>
        <button type="submit" className={styles.submitBtn} disabled={!canSubmit}>
          {submitting ? "שולח…" : "שליחת פנייה"}
        </button>
      </div>
    </form>
  );
}
