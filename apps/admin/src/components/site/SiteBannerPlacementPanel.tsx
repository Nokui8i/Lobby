"use client";

import {
  HOME_BANNERS_COLLECTION,
  HOME_BANNER_ASPECT,
  isBannerLinkClickable,
  LISTING_BANNER_ASPECT,
  LISTING_SIDEBAR_BANNER_ASPECT,
  normalizeSiteBannerPlacement,
  normalizeBannerLinkUrl,
  SITE_BANNER_STORAGE_FOLDER,
  siteBannerStorageFileName,
  type HomeBannerRecord,
  type SiteBannerPlacement,
} from "@lobby/shared";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { deleteObject, getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { ImagePlus, Loader2, Pencil, Plus, Trash2, Upload, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AdminConfirmModal } from "@/components/AdminConfirmModal";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { formatFirebaseError } from "@/lib/firebaseErrorMessage";
import {
  ensureAdminFirestoreAuthReady,
  getFirebaseApp,
  getFirebaseAuth,
  getFirestoreDb,
  getFirebaseStorage,
} from "@/lib/firebase/client";
import { getFunctions, httpsCallable } from "firebase/functions";
import type { User } from "firebase/auth";
import { cn } from "@/lib/utils";
import { BannerLinkFields, SiteBannerEditModal } from "./SiteBannerEditModal";
import {
  siteBannerModal,
  siteBannerModalPanelClass,
  siteBannerModalPreviewClass,
} from "./siteBannerModalClasses";

const PLACEMENT_CONFIG: Record<
  SiteBannerPlacement,
  {
    uploadHint: string;
    previewHint: string;
    deleteDescription: string;
    aspectRatio: number;
    galleryGridClass: string;
    galleryTileClass: string;
  }
> = {
  home: {
    uploadHint: "2400×448 · באנר בראש דף הבית",
    previewHint: "2400×448 — דף הבית",
    deleteDescription: "הבאנר יוסר מדף הבית.",
    aspectRatio: HOME_BANNER_ASPECT,
    galleryGridClass: "grid grid-cols-1 gap-3 sm:grid-cols-2",
    galleryTileClass: "w-full",
  },
  listing: {
    uploadHint: "2400×448 · באנר אופקי בתוך עמוד המודעה (לובי)",
    previewHint: "2400×448 — בתוכן עמוד המודעה (פרסום לובי)",
    deleteDescription: "הבאנר יוסר מעמודי המודעות.",
    aspectRatio: LISTING_BANNER_ASPECT,
    galleryGridClass: "grid grid-cols-1 gap-3 sm:grid-cols-2",
    galleryTileClass: "w-full",
  },
  listing_sidebar: {
    uploadHint: "680×680 ריבוע · מתחת לכרטיס המפרסם (~318px רוחב)",
    previewHint: "680×680 ריבוע — מתחת לפרטי המפרסם (פרסום חיצוני)",
    deleteDescription: "הבאנר יוסר ממיקום הפרסום החיצוני בעמודי מודעה.",
    aspectRatio: LISTING_SIDEBAR_BANNER_ASPECT,
    galleryGridClass: "flex flex-wrap gap-3",
    galleryTileClass: "w-[160px] shrink-0 sm:w-[180px]",
  },
};

async function syncStaffRoleFromServer(user: User): Promise<{ ok: true } | { ok: false; message: string }> {
  await ensureAdminFirestoreAuthReady(user);
  try {
    const fn = httpsCallable<Record<string, never>, { role: string }>(
      getFunctions(getFirebaseApp(), "us-central1"),
      "lobbyAdminResolveMyStaffRole",
    );
    await fn({});
  } catch (err) {
    return { ok: false, message: formatFirebaseError(err) };
  }
  try {
    await user.getIdToken(true);
  } catch {
    /* ignore */
  }
  return { ok: true };
}

function storagePathFromDownloadUrl(url: string): string | null {
  try {
    const u = new URL(url);
    const match = u.pathname.match(/\/o\/(.+)$/);
    if (!match?.[1]) return null;
    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
}

export function SiteBannerPlacementPanel({
  placement,
  banners,
  loading,
  onReload,
  onError,
}: {
  placement: SiteBannerPlacement;
  banners: HomeBannerRecord[];
  loading: boolean;
  onReload: () => Promise<void>;
  onError: (message: string | null) => void;
}) {
  const config = PLACEMENT_CONFIG[placement];
  const { user, staffRole } = useAdminAuth();
  const canEdit = staffRole === "admin" || staffRole === "owner";

  const [uploading, setUploading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<HomeBannerRecord | null>(null);
  const [editTarget, setEditTarget] = useState<HomeBannerRecord | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [pendingUpload, setPendingUpload] = useState<{ file: File; previewUrl: string } | null>(null);
  const [pendingLinkUrl, setPendingLinkUrl] = useState("");
  const [previewDims, setPreviewDims] = useState<{ w: number; h: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewDialogTitleId = `banner-preview-${placement}`;

  const clearPendingUpload = useCallback(() => {
    setPendingUpload((prev) => {
      if (prev?.previewUrl) URL.revokeObjectURL(prev.previewUrl);
      return null;
    });
    setPreviewDims(null);
    setPendingLinkUrl("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const previewUrlRef = useRef<string | null>(null);
  previewUrlRef.current = pendingUpload?.previewUrl ?? null;
  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, []);

  const nextSortOrder = useMemo(
    () => (banners.length ? Math.max(...banners.map((b) => b.sortOrder)) + 1 : 0),
    [banners],
  );

  const uploadFile = async (file: File) => {
    if (!file.type.startsWith("image/") || !canEdit || !user) return;
    setUploading(true);
    onError(null);
    let succeeded = false;
    try {
      const sync = await syncStaffRoleFromServer(user);
      if (!sync.ok) {
        throw new Error(sync.message);
      }
      const auth = getFirebaseAuth();
      if (!auth.currentUser) {
        throw new Error("לא מחובר — התחברו מחדש לאדמין");
      }

      const ext = file.name.match(/\.(jpe?g|png|webp)$/i)?.[1]?.toLowerCase() ?? "jpg";
      await user.getIdToken(true);
      const storage = getFirebaseStorage();
      const fileName = siteBannerStorageFileName(placement, ext);
      const storageRef = ref(storage, `${SITE_BANNER_STORAGE_FOLDER}/${fileName}`);
      await uploadBytes(storageRef, file, { contentType: file.type || "image/jpeg" });
      const imageUrl = await getDownloadURL(storageRef);
      const db = getFirestoreDb();
      await addDoc(collection(db, HOME_BANNERS_COLLECTION), {
        imageUrl,
        alt: "",
        linkUrl: normalizeBannerLinkUrl(pendingLinkUrl),
        sortOrder: nextSortOrder,
        active: true,
        placement,
        createdAt: serverTimestamp(),
      });
      await onReload();
      succeeded = true;
    } catch (err) {
      onError(formatFirebaseError(err));
    } finally {
      setUploading(false);
      if (succeeded) clearPendingUpload();
    }
  };

  const stageFileForPreview = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      onError("נא לבחור קובץ תמונה (JPG, PNG וכו׳).");
      return;
    }
    onError(null);
    setPreviewDims(null);
    setPendingUpload((prev) => {
      if (prev?.previewUrl) URL.revokeObjectURL(prev.previewUrl);
      return { file, previewUrl: URL.createObjectURL(file) };
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDelete = async () => {
    if (!deleteTarget || !canEdit || !user) return;
    setBusyId(deleteTarget.id);
    onError(null);
    try {
      const sync = await syncStaffRoleFromServer(user);
      if (!sync.ok) {
        throw new Error(sync.message);
      }
      const storage = getFirebaseStorage();
      const objectPath = storagePathFromDownloadUrl(deleteTarget.imageUrl);
      if (objectPath) {
        await deleteObject(ref(storage, objectPath));
      }
      const db = getFirestoreDb();
      await deleteDoc(doc(db, HOME_BANNERS_COLLECTION, deleteTarget.id));
      setDeleteTarget(null);
      await onReload();
    } catch (err) {
      onError(formatFirebaseError(err));
    } finally {
      setBusyId(null);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (!canEdit || pendingUpload) return;
    stageFileForPreview(e.dataTransfer.files?.[0]);
  };

  useEffect(() => {
    if (!pendingUpload || uploading) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") clearPendingUpload();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pendingUpload, uploading, clearPendingUpload]);

  return (
    <div className="space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => stageFileForPreview(e.target.files?.[0])}
      />

      <div
        className={cn("space-y-3", dragOver && canEdit && "rounded-xl ring-2 ring-primary/25")}
        aria-label="גלריית באנרים"
        onDragOver={
          canEdit
            ? (e) => {
                e.preventDefault();
                setDragOver(true);
              }
            : undefined
        }
        onDragLeave={canEdit ? () => setDragOver(false) : undefined}
        onDrop={canEdit ? onDrop : undefined}
      >
        <div className="flex flex-wrap items-center justify-start gap-2 border-b border-border/80 pb-3">
          {canEdit ? (
            <button
              type="button"
              disabled={loading || uploading || !!pendingUpload}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-55 sm:text-sm"
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
              {uploading ? "מעלה…" : "הוספת באנר"}
            </button>
          ) : null}
          <p className="text-muted-foreground text-[11px] leading-snug sm:text-xs">{config.uploadHint}</p>
        </div>

        {loading ? (
          <ul className={cn("list-none p-0", config.galleryGridClass)}>
            {[0, 1, 2].map((i) => (
              <li
                key={i}
                className={cn(
                  "animate-pulse rounded-xl bg-slate-200/80",
                  config.galleryTileClass,
                )}
                style={{ aspectRatio: config.aspectRatio }}
              />
            ))}
          </ul>
        ) : banners.length === 0 ? (
          canEdit ? (
            <button
              type="button"
              disabled={uploading || !!pendingUpload}
              onClick={() => fileInputRef.current?.click()}
              className="flex w-full max-w-md flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 px-4 py-10 transition-colors hover:border-primary/50 hover:bg-accent/30"
              style={{ aspectRatio: config.aspectRatio }}
            >
              {uploading ? (
                <span className="text-sm font-semibold text-primary">מעלה…</span>
              ) : (
                <>
                  <ImagePlus className="size-8 text-primary/70" />
                  <span className="text-sm font-semibold text-foreground">אין באנרים — לחצו להוספה</span>
                  <span className="text-muted-foreground flex items-center gap-1 text-xs">
                    <Upload className="size-3.5" />
                    או גררו תמונה לכאן
                  </span>
                </>
              )}
            </button>
          ) : (
            <p className="text-muted-foreground text-sm">אין באנרים במיקום זה.</p>
          )
        ) : (
          <ul className={cn("list-none p-0", config.galleryGridClass)}>
            {banners.map((banner) => (
              <li
                key={banner.id}
                className={cn("relative", config.galleryTileClass, busyId === banner.id && "opacity-60")}
              >
                <div
                  className="relative w-full overflow-hidden rounded-xl border-2 border-slate-200/90 bg-slate-50 shadow-sm"
                  style={{ aspectRatio: config.aspectRatio }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={banner.imageUrl}
                    alt=""
                    className="h-full w-full object-contain object-center"
                    loading="lazy"
                  />
                  {isBannerLinkClickable(banner.linkUrl) ? (
                    <span className="absolute bottom-1.5 start-1.5 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground shadow-sm">
                      לחיץ
                    </span>
                  ) : null}
                </div>
                {canEdit ? (
                  <div className="mt-1.5 flex justify-end gap-1.5">
                    <button
                      type="button"
                      className="flex size-8 items-center justify-center rounded-lg border border-border bg-white text-foreground shadow-sm hover:bg-soft disabled:opacity-45"
                      disabled={!!busyId || uploading}
                      aria-label="עריכת באנר"
                      onClick={() => setEditTarget(banner)}
                    >
                      <Pencil className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      className="flex size-8 items-center justify-center rounded-lg border border-destructive/30 bg-white text-destructive shadow-sm hover:bg-destructive/10 disabled:opacity-45"
                      disabled={!!busyId}
                      aria-label="מחק באנר"
                      onClick={() => setDeleteTarget(banner)}
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>

      {pendingUpload ? (
        <div
          className={siteBannerModal.overlay}
          role="presentation"
          onClick={() => {
            if (!uploading) clearPendingUpload();
          }}
        >
          <div
            className={siteBannerModalPanelClass(config.aspectRatio)}
            role="dialog"
            aria-modal="true"
            aria-labelledby={previewDialogTitleId}
            dir="rtl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className={siteBannerModal.headerRow}>
              <h2 id={previewDialogTitleId} className={siteBannerModal.title}>
                העלאת באנר חדש
              </h2>
              <button
                type="button"
                className={siteBannerModal.closeBtn}
                aria-label="סגור"
                disabled={uploading}
                onClick={clearPendingUpload}
              >
                <X className="size-5" strokeWidth={2} />
              </button>
            </div>
            <p className={cn(siteBannerModal.subtitle, "line-clamp-2 break-all")}>
              {pendingUpload.file.name}
              {previewDims ? ` · ${previewDims.w}×${previewDims.h}px` : null}
            </p>
            <p className="mb-3 text-xs font-medium text-slate-600">{config.previewHint}</p>
            <div className={siteBannerModalPreviewClass(config.aspectRatio)}>
              <div
                className="flex w-full items-center justify-center"
                style={{ aspectRatio: config.aspectRatio }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={pendingUpload.previewUrl}
                  alt=""
                  className="h-full w-full object-contain object-center"
                  onLoad={(ev) => {
                    const { naturalWidth: w, naturalHeight: h } = ev.currentTarget;
                    setPreviewDims({ w, h });
                  }}
                />
              </div>
            </div>
            <div className={siteBannerModal.sectionDivider}>
              <BannerLinkFields
                idPrefix="upload-new"
                value={pendingLinkUrl}
                onChange={setPendingLinkUrl}
                disabled={uploading}
              />
            </div>
            <div className={siteBannerModal.actionsRow}>
              <button
                type="button"
                className={siteBannerModal.confirmBtn}
                disabled={uploading}
                onClick={() => pendingUpload?.file && void uploadFile(pendingUpload.file)}
              >
                {uploading ? <Loader2 className="size-4 animate-spin" /> : null}
                {uploading ? "מעלה…" : "העלאה לאתר"}
              </button>
              <button
                type="button"
                className={siteBannerModal.cancelBtn}
                disabled={uploading}
                onClick={clearPendingUpload}
              >
                ביטול
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {editTarget ? (
        <SiteBannerEditModal
          banner={editTarget}
          aspectRatio={config.aspectRatio}
          placementHint={config.previewHint}
          onClose={() => setEditTarget(null)}
          onSaved={onReload}
          onError={onError}
        />
      ) : null}

      <AdminConfirmModal
        open={!!deleteTarget}
        title="מחיקת באנר?"
        description={config.deleteDescription}
        confirmLabel="מחק"
        danger
        busy={!!busyId}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void handleDelete()}
      />
    </div>
  );
}

export function parseSiteBannerRecord(docId: string, data: Record<string, unknown>): HomeBannerRecord | null {
  const imageUrl = typeof data.imageUrl === "string" ? data.imageUrl : "";
  if (!imageUrl) return null;
  return {
    id: docId,
    imageUrl,
    alt: typeof data.alt === "string" ? data.alt : "",
    linkUrl: typeof data.linkUrl === "string" ? data.linkUrl : "",
    sortOrder: typeof data.sortOrder === "number" ? data.sortOrder : 0,
    active: data.active !== false,
    placement: normalizeSiteBannerPlacement(data.placement),
  };
}
