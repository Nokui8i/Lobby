"use client";

import { useEffect } from "react";
import { bubble } from "@/components/bubble/styles";
import { cn } from "@/lib/utils";

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
  const confirmClass = cn(
    "cursor-pointer rounded-xl px-4 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-55",
    variant === "destructive" ? "bg-[#a21e2e] hover:bg-[#8a1826]" : "btn-puffy",
    isInfo && "w-full",
  );

  return (
    <div
      className="fixed inset-0 z-[120] grid place-items-center bg-[#101820]/30 p-[18px] backdrop-blur-sm"
      role="presentation"
      onClick={() => {
        if (!busy) {
          onCancel();
        }
      }}
    >
      <div
        className="bubble-card w-full max-w-[380px] p-5 pb-4 shadow-bubble direction-rtl"
        role={isInfo ? "dialog" : "alertdialog"}
        aria-modal="true"
        aria-labelledby="lobby-confirm-title"
        aria-describedby="lobby-confirm-body"
        onClick={(e) => e.stopPropagation()}
      >
        <p id="lobby-confirm-title" className={cn("m-0 text-[1.05rem] font-extrabold", bubble.heading)}>
          {title}
        </p>
        <p id="lobby-confirm-body" className="mt-2.5 mb-0 text-sm leading-relaxed text-graphite/60">
          {body}
        </p>
        <div className={cn("mt-5 flex flex-row-reverse justify-end gap-2.5", isInfo && "justify-stretch")}>
          {!isInfo ? (
            <button
              type="button"
              className={cn(bubble.btnOutline, "px-4 py-2.5 disabled:cursor-not-allowed disabled:opacity-55")}
              disabled={busy}
              onClick={onCancel}
            >
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
