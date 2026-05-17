"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  EMPTY_FEED_SEARCH_FILTERS,
  FEED_FEATURE_FILTER_OPTIONS,
  FEED_ROOM_FILTER_OPTIONS,
  feedRoomFilterIdFromFilters,
  feedSearchFiltersFromRoomId,
  feedSearchFiltersIsActive,
  LISTING_PROPERTY_TYPE_OPTIONS,
  toggleFeedRequiredFeature,
  type FeedSearchFilters,
} from "@lobby/shared";
import { LocationSearchInput } from "@/components/LocationSearchInput";
import styles from "./FeedSearchBar.module.css";

function pricePillLabel(filters: FeedSearchFilters): string {
  if (filters.minPriceIls == null && filters.maxPriceIls == null) {
    return "מחיר";
  }
  if (filters.minPriceIls != null && filters.maxPriceIls != null) {
    return `₪${filters.minPriceIls.toLocaleString("he-IL")}–${filters.maxPriceIls.toLocaleString("he-IL")}`;
  }
  if (filters.minPriceIls != null) {
    return `מ-₪${filters.minPriceIls.toLocaleString("he-IL")}`;
  }
  return `עד ₪${filters.maxPriceIls!.toLocaleString("he-IL")}`;
}

export function FeedSearchBar({
  appliedFilters,
  onSearch,
  loading = false,
}: {
  appliedFilters: FeedSearchFilters;
  onSearch: (filters: FeedSearchFilters) => void;
  loading?: boolean;
}) {
  const priceMenuId = useId();
  const priceWrapRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState<FeedSearchFilters>(appliedFilters);
  const [priceOpen, setPriceOpen] = useState(false);

  useEffect(() => {
    setDraft(appliedFilters);
  }, [appliedFilters]);

  useEffect(() => {
    if (!priceOpen) {
      return;
    }
    const onPointerDown = (e: PointerEvent) => {
      if (priceWrapRef.current && !priceWrapRef.current.contains(e.target as Node)) {
        setPriceOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [priceOpen]);

  function runSearch() {
    setPriceOpen(false);
    onSearch(draft);
  }

  function clearAll() {
    setDraft(EMPTY_FEED_SEARCH_FILTERS);
    onSearch(EMPTY_FEED_SEARCH_FILTERS);
  }

  const roomId = feedRoomFilterIdFromFilters(draft);
  const priceActive = draft.minPriceIls != null || draft.maxPriceIls != null;

  return (
    <section className={styles.bar} aria-label="חיפוש וסינון דירות">
      <div className={styles.row}>
        <div className={styles.locationCell}>
          <LocationSearchInput
            label="איפה מחפשים?"
            placeholder="עיר או רחוב"
            value={draft.location}
            onChange={(location) => setDraft((prev) => ({ ...prev, location }))}
            disabled={loading}
            variant="feed"
            compact
          />
        </div>

        <select
          className={styles.pill}
          value={draft.propertyTypeId}
          disabled={loading}
          onChange={(e) => setDraft((prev) => ({ ...prev, propertyTypeId: e.target.value }))}
          aria-label="סוג הנכס"
        >
          <option value="">סוג הנכס</option>
          {LISTING_PROPERTY_TYPE_OPTIONS.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>

        <div className={styles.pricePopover} ref={priceWrapRef}>
          <button
            type="button"
            className={`${styles.priceTrigger} ${priceActive ? styles.priceTriggerActive : ""}`}
            aria-expanded={priceOpen}
            aria-controls={priceMenuId}
            disabled={loading}
            onClick={() => setPriceOpen((open) => !open)}
          >
            {pricePillLabel(draft)}
          </button>
          {priceOpen ? (
            <div id={priceMenuId} className={styles.priceMenu} role="dialog" aria-label="טווח מחיר">
              <div className={styles.priceFields}>
                <label>
                  מינימום (₪)
                  <input
                    inputMode="numeric"
                    value={draft.minPriceIls ?? ""}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/[^\d]/g, "");
                      setDraft((prev) => ({
                        ...prev,
                        minPriceIls: raw ? Number(raw) : null,
                      }));
                    }}
                  />
                </label>
                <label>
                  מקסימום (₪)
                  <input
                    inputMode="numeric"
                    value={draft.maxPriceIls ?? ""}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/[^\d]/g, "");
                      setDraft((prev) => ({
                        ...prev,
                        maxPriceIls: raw ? Number(raw) : null,
                      }));
                    }}
                  />
                </label>
              </div>
            </div>
          ) : null}
        </div>

        <select
          className={styles.pill}
          value={roomId}
          disabled={loading}
          onChange={(e) => {
            const rooms = feedSearchFiltersFromRoomId(e.target.value);
            setDraft((prev) => ({ ...prev, ...rooms }));
          }}
          aria-label="מספר חדרים"
        >
          {FEED_ROOM_FILTER_OPTIONS.map((o) => (
            <option key={o.id || "all"} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>

        <button type="button" className={styles.searchBtn} disabled={loading} onClick={runSearch}>
          חיפוש
        </button>

        {feedSearchFiltersIsActive(appliedFilters) ? (
          <button type="button" className={styles.clearBtn} disabled={loading} onClick={clearAll}>
            נקה
          </button>
        ) : null}
      </div>

      <div className={styles.featureRow} role="group" aria-label="מאפיינים">
        {FEED_FEATURE_FILTER_OPTIONS.map((opt) => {
          const on = draft.requiredFeatures.includes(opt.id);
          return (
            <button
              key={opt.id}
              type="button"
              className={`${styles.featureChip} ${on ? styles.featureChipOn : ""}`}
              disabled={loading}
              aria-pressed={on}
              onClick={() =>
                setDraft((prev) => ({
                  ...prev,
                  requiredFeatures: toggleFeedRequiredFeature(prev.requiredFeatures, opt.id),
                }))
              }
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </section>
  );
}
