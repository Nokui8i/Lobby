"use client";

import { useEffect } from "react";
import styles from "./LobbyConfirmDialog.module.css";

export type LobbyConfirmDialogVariant = "default" | "destructive" | "info";

export interface LobbyConfirmDialogProps {
  open: boolean;
  title: string;
  body: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: LobbyConfirmDialogVariant;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function LobbyConfirmDialog({
  open,
  title,
  body,
  confirmLabel = "אישור",
  cancelLabel = "ביטול",
  variant = "default",
  busy = false,
  onConfirm,
  onCancel,
}: LobbyConfirmDialogProps) {
  useEffect(() => {
    if (!open) {
      return;
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) {
        onCancel();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, busy, onCancel]);

  if (!open) {
    return null;
  }

  const isInfo = variant === "info";
  const confirmClass =
    variant === "destructive"
      ? `${styles.confirm} ${styles.confirmDestructive}`
      : `${styles.confirm}${isInfo ? ` ${styles.confirmInfo}` : ""}`;

  return (
    <div
      className={styles.overlay}
      role="presentation"
      onClick={() => {
        if (!busy) {
          onCancel();
        }
      }}
    >
      <div
        className={styles.dialog}
        role={isInfo ? "dialog" : "alertdialog"}
        aria-modal="true"
        aria-labelledby="lobby-confirm-title"
        aria-describedby="lobby-confirm-body"
        onClick={(e) => e.stopPropagation()}
      >
        <p id="lobby-confirm-title" className={styles.title}>
          {title}
        </p>
        <p id="lobby-confirm-body" className={styles.body}>
          {body}
        </p>
        <div className={`${styles.actions}${isInfo ? ` ${styles.actionsSingle}` : ""}`}>
          {!isInfo ? (
            <button type="button" className={styles.cancel} disabled={busy} onClick={onCancel}>
              {cancelLabel}
            </button>
          ) : null}
          <button type="button" className={confirmClass} disabled={busy} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
