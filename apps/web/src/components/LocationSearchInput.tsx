"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  groupLocationSuggestionsByKind,
  LOCATION_STREET_SECTION_NOTICE_HE,
  locationSuggestionDisplaySubtitle,
  locationSuggestionDisplayTitle,
  resolvedLocationDisplayLine,
  type LocationSuggestion,
  type ResolvedLocation,
} from "@lobby/shared";
import { isFirebaseConfigured } from "@/lib/firebase/isConfigured";
import {
  lobbyPlacesAutocomplete,
  lobbyPlacesCitiesAutocomplete,
  lobbyPlacesResolve,
  lobbyPlacesStreetsByCity,
} from "@/lib/firebase/places";
import styles from "./LocationSearchInput.module.css";

function newSessionToken(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `lobby-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function LocationSearchInput({
  label,
  placeholder = "עיר או רחוב",
  value,
  onChange,
  disabled = false,
  required = false,
  variant = "publish",
  compact = false,
  searchMode = "all",
  cityPlaceId,
}: {
  label: string;
  placeholder?: string;
  value: ResolvedLocation | null;
  onChange: (location: ResolvedLocation | null) => void;
  disabled?: boolean;
  required?: boolean;
  /** feed: הודעת רחוב כמו Yad2 */
  variant?: "publish" | "feed";
  /** מסך פיד — בלי כרטיס בחירה נפרד */
  compact?: boolean;
  /** פרסום: חיפוש ממוקד לעיר או לרחוב בעיר */
  searchMode?: "all" | "city" | "street";
  /** חובה כש-searchMode הוא street */
  cityPlaceId?: string;
}) {
  const listId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [sessionToken, setSessionToken] = useState(() => newSessionToken());
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (value) {
      setQuery(resolvedLocationDisplayLine(value));
    }
  }, [value]);

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

  const runSearch = useCallback(
    async (text: string, token: string) => {
      if (!isFirebaseConfigured()) {
        setError("אין חיבור לשרת.");
        setSuggestions([]);
        return;
      }
      if (text.trim().length < 2) {
        setSuggestions([]);
        setError(null);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        let items: LocationSuggestion[];
        if (searchMode === "city") {
          items = await lobbyPlacesCitiesAutocomplete(text, token);
        } else if (searchMode === "street") {
          if (!cityPlaceId) {
            setSuggestions([]);
            return;
          }
          items = await lobbyPlacesStreetsByCity(cityPlaceId, text, token);
        } else if (variant === "publish") {
          items = await lobbyPlacesAutocomplete(text, token, "streets");
        } else {
          items = await lobbyPlacesAutocomplete(text, token);
        }
        setSuggestions(items);
        setOpen(true);
      } catch {
        setSuggestions([]);
        setError("חיפוש כתובות לא זמין כרגע.");
      } finally {
        setLoading(false);
      }
    },
    [searchMode, cityPlaceId, variant],
  );

  useEffect(() => {
    if (value) {
      return;
    }
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      return;
    }
    const handle = window.setTimeout(() => {
      void runSearch(trimmed, sessionToken);
    }, 280);
    return () => window.clearTimeout(handle);
  }, [query, sessionToken, value, runSearch]);

  const pickSuggestion = useCallback(
    async (item: LocationSuggestion) => {
      if (variant === "publish" && item.kind !== "street") {
        setError("נא לבחור רחוב מהרשימה — לא עיר, שכונה או מחוז.");
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const resolved = await lobbyPlacesResolve(item.placeId, sessionToken);
        if (variant === "publish" && resolved.kind !== "street") {
          setError("נא לבחור רחוב מהרשימה — לא עיר, שכונה או מחוז.");
          return;
        }
        onChange(resolved);
        setQuery(resolvedLocationDisplayLine(resolved));
        setOpen(false);
        setSuggestions([]);
        setSessionToken(newSessionToken());
      } catch {
        setError("לא ניתן לאשר את הכתובת. נסו שוב.");
      } finally {
        setLoading(false);
      }
    },
    [onChange, sessionToken, variant],
  );

  const clearSelection = useCallback(() => {
    onChange(null);
    setQuery("");
    setSuggestions([]);
    setSessionToken(newSessionToken());
    setError(null);
  }, [onChange]);

  const suggestionGroups =
    variant === "feed" && searchMode === "all"
      ? groupLocationSuggestionsByKind(suggestions)
      : null;

  return (
    <div className={styles.wrap} ref={wrapRef}>
      {!compact && label ? (
      <label htmlFor={listId}>
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </label>
      ) : null}
      <input
        id={listId}
        className={styles.input}
        type="search"
        autoComplete="off"
        aria-label={compact ? label || placeholder : undefined}
        placeholder={placeholder}
        value={query}
        disabled={disabled}
        onChange={(e) => {
          const next = e.target.value;
          setQuery(next);
          if (value) {
            onChange(null);
          }
          setOpen(true);
        }}
        onFocus={() => {
          if (suggestions.length > 0) {
            setOpen(true);
          }
        }}
      />

      {value && !compact ? (
        <div className={styles.selected}>
          <p className={styles.selectedTitle}>{value.primaryLabel}</p>
          <p className={styles.selectedMeta}>{value.secondaryLabel || value.cityLabel}</p>
          <button type="button" className={styles.clearBtn} onClick={clearSelection} disabled={disabled}>
            שינוי כתובת
          </button>
        </div>
      ) : null}

      {open && !value && (loading || suggestions.length > 0) ? (
        <div className={styles.panel} role="listbox">
          {loading ? <p className={styles.loading}>מחפשים…</p> : null}
          {suggestionGroups
            ? suggestionGroups.map((group) => (
                <div key={group.kind} className={styles.section}>
                  <div className={styles.sectionHeader} role="presentation">
                    <span>{group.label}</span>
                    {group.kind === "street" && variant === "feed" ? (
                      <span className={styles.sectionHeaderNote}>{LOCATION_STREET_SECTION_NOTICE_HE}</span>
                    ) : null}
                  </div>
                  {group.items.map((item) => {
                    const subtitle = locationSuggestionDisplaySubtitle(item);
                    return (
                      <button
                        key={item.placeId}
                        type="button"
                        className={styles.option}
                        role="option"
                        onClick={() => void pickSuggestion(item)}
                      >
                        <span className={styles.optionTitle}>{locationSuggestionDisplayTitle(item)}</span>
                        {subtitle ? <span className={styles.optionMeta}>{subtitle}</span> : null}
                      </button>
                    );
                  })}
                </div>
              ))
            : suggestions.map((item) => (
                <button
                  key={item.placeId}
                  type="button"
                  className={styles.option}
                  role="option"
                  onClick={() => void pickSuggestion(item)}
                >
                  <span className={styles.optionTitle}>{locationSuggestionDisplayTitle(item)}</span>
                  {locationSuggestionDisplaySubtitle(item) ? (
                    <span className={styles.optionMeta}>{locationSuggestionDisplaySubtitle(item)}</span>
                  ) : null}
                </button>
              ))}
        </div>
      ) : null}

      {error ? <p className={styles.error}>{error}</p> : null}
      {!compact && !value && !error ? (
        <p className={styles.hint}>
          {searchMode === "city"
            ? "בחרו עיר מהרשימה."
            : searchMode === "street"
              ? "בחרו רחוב מהרשימה."
              : variant === "publish"
                ? "רחוב בלבד — בחרו מהרשימה (שם רחוב + עיר)."
                : "בחרו עיר לכל המודעות בעיר, או רחוב ספציפי (למשל: הנביאים, תל אביב)."}
        </p>
      ) : null}
    </div>
  );
}
