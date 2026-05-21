"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  groupLocationSuggestionsByKind,
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
import { cn } from "@/lib/utils";

const loc = {
  wrap: "relative direction-rtl",
  input:
    "h-12 w-full rounded-2xl border-0 bg-soft px-4 text-[15px] text-graphite focus:bg-white focus:shadow-float disabled:opacity-60",
  selected: "mt-2 rounded-xl border border-brand/20 bg-brand/5 px-3 py-2.5",
  selectedTitle: "m-0 text-sm font-semibold text-graphite",
  selectedMeta: "mt-1 mb-0 text-[13px] text-graphite/50",
  clearBtn: "mt-2 cursor-pointer border-0 bg-transparent p-0 text-[13px] font-bold text-brand",
  panel:
    "absolute top-[calc(100%+6px)] right-0 left-0 z-[200] max-h-[min(280px,50vh)] overflow-auto rounded-xl border border-slate-200/90 bg-white shadow-[0_4px_16px_rgba(15,23,42,0.1),0_12px_32px_rgba(15,23,42,0.12)]",
  section: "border-t border-[#e9edf7] first:border-t-0",
  sectionHeader: "bg-[#F5FAFC] px-3.5 py-2 text-[12px] font-extrabold text-[#a3aed0]",
  option:
    "block w-full cursor-pointer border-0 border-t border-graphite/5 bg-white px-3.5 py-3 text-right first:border-t-0 hover:bg-brand/10",
  optionTitle: "block text-sm font-semibold text-graphite",
  optionMeta: "mt-0.5 block text-[13px] text-[#a3aed0]",
  hint: "mt-1.5 mb-0 text-[13px] text-[#a3aed0]",
  error: "mt-1.5 mb-0 text-[13px] text-red-700",
  loading: "px-3.5 py-3 text-[13px] text-[#a3aed0]",
} as const;

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
    <div className={loc.wrap} ref={wrapRef}>
      {!compact && label ? (
      <label htmlFor={listId}>
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </label>
      ) : null}
      <input
        id={listId}
        className={cn(
          loc.input,
          compact &&
            "rounded-xl border border-slate-200/80 font-medium outline-none focus:border-brand focus:bg-soft focus:shadow-none focus:ring-2 focus:ring-brand/15",
          compact && variant === "feed" && "h-10 bg-white px-3 text-sm",
          compact && variant === "publish" && "h-11 bg-soft px-4 text-[15px]",
        )}
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
        <div className={loc.selected}>
          <p className={loc.selectedTitle}>{value.primaryLabel}</p>
          <p className={loc.selectedMeta}>{value.secondaryLabel || value.cityLabel}</p>
          <button type="button" className={loc.clearBtn} onClick={clearSelection} disabled={disabled}>
            שינוי כתובת
          </button>
        </div>
      ) : null}

      {open && !value && (loading || suggestions.length > 0) ? (
        <div className={loc.panel} role="listbox">
          {loading ? <p className={loc.loading}>מחפשים…</p> : null}
          {suggestionGroups
            ? suggestionGroups.map((group) => (
                <div key={group.kind} className={loc.section}>
                  <div className={loc.sectionHeader} role="presentation">
                    {group.label}
                  </div>
                  {group.items.map((item) => {
                    const subtitle = locationSuggestionDisplaySubtitle(item);
                    return (
                      <button
                        key={item.placeId}
                        type="button"
                        className={loc.option}
                        role="option"
                        onClick={() => void pickSuggestion(item)}
                      >
                        <span className={loc.optionTitle}>{locationSuggestionDisplayTitle(item)}</span>
                        {subtitle ? <span className={loc.optionMeta}>{subtitle}</span> : null}
                      </button>
                    );
                  })}
                </div>
              ))
            : suggestions.map((item) => (
                <button
                  key={item.placeId}
                  type="button"
                  className={loc.option}
                  role="option"
                  onClick={() => void pickSuggestion(item)}
                >
                  <span className={loc.optionTitle}>{locationSuggestionDisplayTitle(item)}</span>
                  {locationSuggestionDisplaySubtitle(item) ? (
                    <span className={loc.optionMeta}>{locationSuggestionDisplaySubtitle(item)}</span>
                  ) : null}
                </button>
              ))}
        </div>
      ) : null}

      {error ? <p className={loc.error}>{error}</p> : null}
      {!compact && !value && !error ? (
        <p className={loc.hint}>
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
