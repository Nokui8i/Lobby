"use client";

import { useEffect, useId, useRef, useState } from "react";
import { FEED_SORT_OPTIONS, feedSortTriggerLabel, type FeedSortId } from "@lobby/shared";
import styles from "./FeedSortMenu.module.css";

export function FeedSortMenu({
  value,
  onChange,
  disabled = false,
}: {
  value: FeedSortId;
  onChange: (sortId: FeedSortId) => void;
  disabled?: boolean;
}) {
  const menuId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onPointerDown = (e: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  return (
    <div className={styles.wrap} ref={wrapRef}>
      <button
        type="button"
        className={styles.trigger}
        aria-expanded={open}
        aria-controls={menuId}
        aria-haspopup="listbox"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
      >
        <span>{feedSortTriggerLabel(value)}</span>
        <span className={styles.chevron} aria-hidden="true">
          {open ? "▴" : "▾"}
        </span>
      </button>
      {open ? (
        <ul id={menuId} className={styles.menu} role="listbox" aria-label="מיון מודעות">
          {FEED_SORT_OPTIONS.map((opt) => {
            const selected = value === opt.id;
            return (
              <li key={opt.id} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  className={styles.option}
                  onClick={() => {
                    onChange(opt.id);
                    setOpen(false);
                  }}
                >
                  <span className={styles.optionLabel}>{opt.label}</span>
                  {selected ? (
                    <span className={styles.check} aria-hidden="true">
                      ✓
                    </span>
                  ) : (
                    <span className={styles.checkPlaceholder} aria-hidden="true" />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
