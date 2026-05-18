"use client";

import { useEffect, useId, useRef, useState } from "react";
import styles from "./ThreadCardMenu.module.css";

interface ThreadCardMenuProps {
  ariaLabel: string;
  deleteLabel: string;
  onDeleteClick: () => void;
}

export function ThreadCardMenu({ ariaLabel, deleteLabel, onDeleteClick }: ThreadCardMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) {
      return;
    }
    const onPointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  return (
    <div className={styles.root} ref={rootRef}>
      <button
        type="button"
        className={styles.trigger}
        aria-label={ariaLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen((value) => !value);
        }}
      >
        <span className={styles.dots} aria-hidden>
          ⋮
        </span>
      </button>
      {open ? (
        <ul id={menuId} className={styles.menu} role="menu">
          <li role="none">
            <button
              type="button"
              role="menuitem"
              className={styles.menuItemDanger}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setOpen(false);
                onDeleteClick();
              }}
            >
              {deleteLabel}
            </button>
          </li>
        </ul>
      ) : null}
    </div>
  );
}
