"use client";

import {
  HOME_BANNERS_COLLECTION,
  isBannerLinkClickable,
  normalizeBannerLinkUrl,
  type HomeBannerRecord,
} from "@lobby/shared";
import { doc, updateDoc } from "firebase/firestore";
import { Loader2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { formatFirebaseError } from "@/lib/firebaseErrorMessage";
import { getFirestoreDb } from "@/lib/firebase/client";
import { cn } from "@/lib/utils";
import {
  siteBannerModal,
  siteBannerModalPanelClass,
  siteBannerModalPreviewClass,
} from "./siteBannerModalClasses";

function BannerLinkFields({
  value,
  onChange,
  disabled,
  idPrefix,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  idPrefix: string;
}) {
  const normalized = normalizeBannerLinkUrl(value);
  return (
    <div className="space-y-2.5 text-right" dir="rtl">
      <label htmlFor={`${idPrefix}-link`} className="block text-sm font-bold text-foreground">
        קישור (אופציונלי)
      </label>
      <input
        id={`${idPrefix}-link`}
        type="url"
        dir="ltr"
        value={value}
        disabled={disabled}
        placeholder="/publish או https://example.com"
        className={siteBannerModal.linkInput}
        onChange={(e) => onChange(e.target.value)}
      />
      <p className="text-xs font-medium leading-snug text-slate-600">
        {isBannerLinkClickable(normalized)
          ? "הבאנר יהיה לחיץ באתר ובאפליקציה."
          : "בלי קישור — הבאנר לא יהיה לחיץ."}
      </p>
    </div>
  );
}

export function SiteBannerEditModal({
  banner,
  aspectRatio,
  placementHint,
  onClose,
  onSaved,
  onError,
}: {
  banner: HomeBannerRecord;
  aspectRatio: number;
  placementHint: string;
  onClose: () => void;
  onSaved: () => Promise<void>;
  onError: (message: string | null) => void;
}) {
  const [linkDraft, setLinkDraft] = useState(banner.linkUrl);
  const [saving, setSaving] = useState(false);
  const titleId = `banner-edit-${banner.id}`;

  useEffect(() => {
    setLinkDraft(banner.linkUrl);
  }, [banner.id, banner.linkUrl]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !saving) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, saving]);

  const normalized = normalizeBannerLinkUrl(linkDraft);
  const dirty = normalized !== normalizeBannerLinkUrl(banner.linkUrl);

  async function handleSave() {
    setSaving(true);
    onError(null);
    try {
      const db = getFirestoreDb();
      await updateDoc(doc(db, HOME_BANNERS_COLLECTION, banner.id), {
        linkUrl: normalized,
      });
      await onSaved();
      onClose();
    } catch (err) {
      onError(formatFirebaseError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className={siteBannerModal.overlay}
      role="presentation"
      onClick={() => {
        if (!saving) onClose();
      }}
    >
      <div
        className={siteBannerModalPanelClass(aspectRatio)}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        dir="rtl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={siteBannerModal.headerRow}>
          <h2 id={titleId} className={siteBannerModal.title}>
            עריכת באנר
          </h2>
          <button
            type="button"
            className={siteBannerModal.closeBtn}
            aria-label="סגור"
            disabled={saving}
            onClick={onClose}
          >
            <X className="size-5" strokeWidth={2} />
          </button>
        </div>
        <p className={siteBannerModal.subtitle}>{placementHint}</p>

        <div className={cn(siteBannerModalPreviewClass(aspectRatio), "mt-4")}>
          <div className="flex w-full items-center justify-center" style={{ aspectRatio }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={banner.imageUrl}
              alt=""
              className="h-full w-full object-contain object-center"
            />
          </div>
        </div>

        <div className={siteBannerModal.sectionDivider}>
          <BannerLinkFields
            idPrefix={`edit-${banner.id}`}
            value={linkDraft}
            onChange={setLinkDraft}
            disabled={saving}
          />
        </div>

        <div className={siteBannerModal.actionsRow}>
          <button
            type="button"
            className={siteBannerModal.confirmBtn}
            disabled={saving || !dirty}
            onClick={() => void handleSave()}
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : null}
            {saving ? "שומר…" : "שמירה"}
          </button>
          <button
            type="button"
            className={siteBannerModal.cancelBtn}
            disabled={saving}
            onClick={onClose}
          >
            ביטול
          </button>
        </div>
      </div>
    </div>
  );
}

export { BannerLinkFields };
