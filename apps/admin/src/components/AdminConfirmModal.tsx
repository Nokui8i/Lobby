"use client";

import { useEffect, type ReactNode } from "react";
import { ap } from "@/lib/admin-page-classes";
import { cn } from "@/lib/utils";

type AdminConfirmModalProps = {
  open: boolean;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function AdminConfirmModal({
  open,
  title,
  description,
  confirmLabel = "אישור",
  cancelLabel = "ביטול",
  danger = false,
  busy = false,
  onConfirm,
  onCancel,
}: AdminConfirmModalProps) {
  useEffect(() => {
    if (!open) {
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) {
        onCancel();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, busy, onCancel]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-foreground/40 p-5 backdrop-blur-[2px]"
      role="presentation"
      onClick={busy ? undefined : onCancel}
    >
      <div
        className="bubble-card w-full max-w-[440px] p-5 shadow-lg"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-confirm-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="admin-confirm-title" className="font-display mb-2.5 text-lg font-semibold">
          {title}
        </h2>
        {description ? (
          <div className="text-muted-foreground mb-4 text-sm leading-relaxed">{description}</div>
        ) : null}
        <div className="flex flex-wrap justify-end gap-2.5 pt-1">
          <button type="button" disabled={busy} onClick={onCancel} className={ap.modalCancelBtn}>
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className={cn(danger ? ap.modalDangerConfirmBtn : ap.modalConfirmBtn)}
          >
            {busy ? "מבצע…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}


