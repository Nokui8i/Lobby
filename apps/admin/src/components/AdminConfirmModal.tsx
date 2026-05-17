"use client";

import { useEffect, type ReactNode } from "react";
import styles from "./AdminConfirmModal.module.css";

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
    <div className={styles.backdrop} role="presentation" onClick={busy ? undefined : onCancel}>
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-confirm-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="admin-confirm-title">{title}</h2>
        {description ? <div className={styles.body}>{description}</div> : null}
        <div className={styles.actions}>
          <button type="button" className={styles.cancelBtn} disabled={busy} onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={danger ? styles.dangerBtn : styles.confirmBtn}
            disabled={busy}
            onClick={onConfirm}
          >
            {busy ? "מבצע…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
