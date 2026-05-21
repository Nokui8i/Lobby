"use client";

import {
  LISTING_DESCRIPTION_MAX_CHARACTERS,
  LISTING_PROPERTY_CONDITION_OPTIONS,
  LISTING_PROPERTY_TYPE_OPTIONS,
  LISTING_STATUS_LABEL_HE,
  LISTING_TITLE_MAX_CHARACTERS,
  listingPublishCountdownLabel,
  staffCanPerformAction,
  type AdminListingDetail,
  type AdminListingModerationAction,
} from "@lobby/shared";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AdminConfirmModal } from "@/components/AdminConfirmModal";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { adminUsersSearchUrl, consumerListingUrl } from "@/lib/consumerUrls";
import {
  fetchAdminListing,
  moderateAdminListing,
  updateAdminListing,
} from "@/lib/firebase/functions";
import { ap } from "@/lib/admin-page-classes";
import { lp } from "@/lib/admin-page-classes";

type PendingModeration =
  | { type: "remove" }
  | { type: "return_to_draft" }
  | { type: "approve" };

export default function AdminListingDetailPage() {
  const params = useParams<{ listingId: string }>();
  const listingId = params.listingId ?? "";
  const { staffRole } = useAdminAuth();
  const canEdit = staffRole ? staffCanPerformAction(staffRole, "listings.update") : false;
  const canModerate = staffRole ? staffCanPerformAction(staffRole, "listings.moderate") : false;

  const [listing, setListing] = useState<AdminListingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingModeration | null>(null);
  const [draftNote, setDraftNote] = useState("");

  const [title, setTitle] = useState("");
  const [priceIls, setPriceIls] = useState("");
  const [rooms, setRooms] = useState("");
  const [sizeSqm, setSizeSqm] = useState("");
  const [floor, setFloor] = useState("");
  const [totalFloors, setTotalFloors] = useState("");
  const [entryDate, setEntryDate] = useState("");
  const [description, setDescription] = useState("");
  const [propertyTypeId, setPropertyTypeId] = useState("");
  const [propertyConditionId, setPropertyConditionId] = useState("");

  const load = useCallback(async () => {
    if (!listingId) {
      return;
    }
    setLoading(true);
    setError(false);
    try {
      const row = await fetchAdminListing(listingId);
      setListing(row);
      setTitle(row.title);
      setPriceIls(String(row.priceIls));
      setRooms(String(row.rooms));
      setSizeSqm(String(row.sizeSqm));
      setFloor(String(row.floor));
      setTotalFloors(String(row.totalFloors));
      setEntryDate(row.entryDate);
      setDescription(row.description);
      setPropertyTypeId(row.propertyTypeId);
      setPropertyConditionId(row.propertyConditionId);
    } catch {
      setListing(null);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [listingId]);

  useEffect(() => {
    void load();
  }, [load]);

  const countdown = listing
    ? listingPublishCountdownLabel({
        status: listing.status,
        expiresAt: listing.expiresAt,
        publishRemainingMs: listing.publishRemainingMs,
        moderationDraftNote: listing.moderationDraftNote,
        moderationAction: listing.moderationAction,
      })
    : null;

  async function handleSave() {
    if (!listing || !canEdit) {
      return;
    }
    setBusy(true);
    setToast(null);
    try {
      const updated = await updateAdminListing({
        listingId: listing.id,
        title: title.trim(),
        priceIls: Number(priceIls),
        rooms: Number(rooms),
        sizeSqm: Number(sizeSqm),
        floor: Number(floor),
        totalFloors: Number(totalFloors),
        entryDate: entryDate.trim() || "מיידי",
        description: description.trim(),
        propertyTypeId,
        propertyConditionId,
      });
      setListing(updated);
      setToast("המודעה עודכנה.");
    } catch {
      setToast("השמירה נכשלה.");
    } finally {
      setBusy(false);
    }
  }

  async function runModeration(action: AdminListingModerationAction, note?: string) {
    if (!listing) {
      return;
    }
    setBusy(true);
    setToast(null);
    try {
      const updated = await moderateAdminListing(listing.id, action, note);
      setListing(updated);
      setTitle(updated.title);
      setPriceIls(String(updated.priceIls));
      setRooms(String(updated.rooms));
      setSizeSqm(String(updated.sizeSqm));
      setFloor(String(updated.floor));
      setTotalFloors(String(updated.totalFloors));
      setEntryDate(updated.entryDate);
      setDescription(updated.description);
      setPending(null);
      setDraftNote("");
      setToast("הפעולה בוצעה.");
    } catch {
      setToast("הפעולה נכשלה.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <p className={ap.empty}>טוען…</p>;
  }

  if (error || !listing) {
    return (
      <div className={ap.page}>
        <Link href="/listings" className={ap.back}>
          ← חזרה למודעות
        </Link>
        <p className={ap.error}>המודעה לא נמצאה.</p>
      </div>
    );
  }

  return (
    <div className={ap.page}>
      <header className={ap.header}>
        <div>
          <Link href="/listings" className={ap.back}>
            ← חזרה למודעות
          </Link>
          <h1>{listing.title || "מודעה"}</h1>
          <p className={ap.sub}>
            {LISTING_STATUS_LABEL_HE[listing.status]}
            {countdown ? ` · ${countdown}` : ""}
          </p>
          <p className={ap.meta}>
            מפרסם:{" "}
            <Link href={adminUsersSearchUrl(listing.publisherEmail || listing.publisherId)}>
              {listing.publisherEmail || listing.publisherDisplayName}
            </Link>
            {" · "}
            <Link
              href={`/listings?publisherId=${encodeURIComponent(listing.publisherId)}`}
            >
              כל מודעות המפרסם
            </Link>
          </p>
        </div>
        {(listing.status === "active" || listing.status === "frozen") && (
          <Link
            href={consumerListingUrl(listing.id)}
            target="_blank"
            rel="noopener noreferrer"
            className={lp.linkBtn}
          >
            צפייה באתר
          </Link>
        )}
      </header>

      {toast ? <p className={ap.sub}>{toast}</p> : null}

      <div className={lp.readonlyBlock}>
        <strong>מיקום (לקריאה בלבד):</strong> {listing.locationLine}
        <br />
        <strong>מזהה:</strong> {listing.id}
      </div>

      {canModerate ? (
        <div className={lp.toolbar}>
          {listing.status === "pending_review" ? (
            <button
              type="button"
              className={lp.primaryBtn}
              disabled={busy}
              onClick={() => setPending({ type: "approve" })}
            >
              אישור ללוח
            </button>
          ) : null}
          {listing.status !== "removed" && listing.status !== "rented" ? (
            <>
              <button
                type="button"
                className={lp.linkBtn}
                disabled={busy}
                onClick={() => {
                  setDraftNote("");
                  setPending({ type: "return_to_draft" });
                }}
              >
                החזרה לטיוטה
              </button>
              <button
                type="button"
                className={lp.dangerBtn}
                disabled={busy}
                onClick={() => setPending({ type: "remove" })}
              >
                הסרה מהפלטפורמה
              </button>
            </>
          ) : null}
        </div>
      ) : null}

      {canEdit ? (
        <form
          className={lp.editForm}
          onSubmit={(e) => {
            e.preventDefault();
            void handleSave();
          }}
        >
          <div className={lp.field}>
            <label htmlFor="adm-title">כותרת</label>
            <input
              id="adm-title"
              value={title}
              maxLength={LISTING_TITLE_MAX_CHARACTERS}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className={lp.field}>
            <label htmlFor="adm-price">מחיר (₪ לחודש)</label>
            <input
              id="adm-price"
              type="number"
              min={1}
              value={priceIls}
              onChange={(e) => setPriceIls(e.target.value)}
            />
          </div>
          <div className={lp.field}>
            <label htmlFor="adm-rooms">חדרים</label>
            <input
              id="adm-rooms"
              type="number"
              step="0.5"
              min={0.5}
              value={rooms}
              onChange={(e) => setRooms(e.target.value)}
            />
          </div>
          <div className={lp.field}>
            <label htmlFor="adm-size">מ״ר</label>
            <input
              id="adm-size"
              type="number"
              min={1}
              value={sizeSqm}
              onChange={(e) => setSizeSqm(e.target.value)}
            />
          </div>
          <div className={lp.field}>
            <label htmlFor="adm-floor">קומה / סה״ק</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                id="adm-floor"
                type="number"
                value={floor}
                onChange={(e) => setFloor(e.target.value)}
              />
              <input
                aria-label="קומות בבניין"
                type="number"
                value={totalFloors}
                onChange={(e) => setTotalFloors(e.target.value)}
              />
            </div>
          </div>
          <div className={lp.field}>
            <label htmlFor="adm-entry">כניסה</label>
            <input id="adm-entry" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} />
          </div>
          <div className={lp.field}>
            <label htmlFor="adm-type">סוג נכס</label>
            <select
              id="adm-type"
              value={propertyTypeId}
              onChange={(e) => setPropertyTypeId(e.target.value)}
            >
              <option value="">—</option>
              {LISTING_PROPERTY_TYPE_OPTIONS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className={lp.field}>
            <label htmlFor="adm-condition">מצב נכס</label>
            <select
              id="adm-condition"
              value={propertyConditionId}
              onChange={(e) => setPropertyConditionId(e.target.value)}
            >
              <option value="">—</option>
              {LISTING_PROPERTY_CONDITION_OPTIONS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className={lp.field}>
            <label htmlFor="adm-desc">תיאור</label>
            <textarea
              id="adm-desc"
              maxLength={LISTING_DESCRIPTION_MAX_CHARACTERS}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <button type="submit" className={lp.primaryBtn} disabled={busy}>
            {busy ? "שומר…" : "שמירת שינויים"}
          </button>
        </form>
      ) : (
        <p className={ap.sub}>לצפייה בלבד — עריכה למנהלים ומעלה.</p>
      )}

      <AdminConfirmModal
        open={pending?.type === "approve"}
        title="לאשר חזרה ללוח?"
        description={<p>המודעה תחזור לפיד עם ימי הפרסום שנשמרו.</p>}
        confirmLabel="אישור"
        busy={busy}
        onCancel={() => setPending(null)}
        onConfirm={() => void runModeration("approve")}
      />

      <AdminConfirmModal
        open={pending?.type === "remove"}
        title="להסיר את המודעה?"
        description={<p>המודעה תוסר מהפלטפורמה והמפרסם יקבל התראה.</p>}
        confirmLabel="הסר"
        danger
        busy={busy}
        onCancel={() => setPending(null)}
        onConfirm={() => void runModeration("remove")}
      />

      <AdminConfirmModal
        open={pending?.type === "return_to_draft"}
        title="להחזיר לטיוטה?"
        description={
          <label className={ap.draftField}>
            <span className={ap.draftLabel}>הסבר למפרסם</span>
            <textarea
              className={ap.draftTextarea}
              rows={4}
              value={draftNote}
              onChange={(e) => setDraftNote(e.target.value)}
            />
          </label>
        }
        confirmLabel="החזר לטיוטה"
        busy={busy}
        onCancel={() => {
          setPending(null);
          setDraftNote("");
        }}
        onConfirm={() => {
          if (draftNote.trim().length >= 5) {
            void runModeration("return_to_draft", draftNote);
          }
        }}
      />
    </div>
  );
}

