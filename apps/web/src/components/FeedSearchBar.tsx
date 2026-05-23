"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
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
import { bubble } from "@/components/bubble/styles";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { lobbySelectOptionCls, useLobbySelectListHighlight } from "@/components/ui/lobby-select-option";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

function pricePillLabel(filters: FeedSearchFilters): string {
  if (filters.minPriceIls == null && filters.maxPriceIls == null) return "מחיר";
  if (filters.minPriceIls != null && filters.maxPriceIls != null) {
    return `₪${filters.minPriceIls.toLocaleString("he-IL")}–${filters.maxPriceIls.toLocaleString("he-IL")}`;
  }
  if (filters.minPriceIls != null) return `מ-₪${filters.minPriceIls.toLocaleString("he-IL")}`;
  return `עד ₪${filters.maxPriceIls!.toLocaleString("he-IL")}`;
}

const feedFieldClass =
  "h-10 w-full shrink-0 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-graphite outline-none transition-colors placeholder:text-graphite/40 focus:border-brand focus:ring-2 focus:ring-brand/15 disabled:opacity-50";

const feedPopoverClass =
  "z-[200] max-h-[min(280px,50vh)] overflow-y-auto rounded-xl border border-slate-200/90 bg-white p-1 shadow-[0_4px_16px_rgba(15,23,42,0.1),0_12px_32px_rgba(15,23,42,0.12)]";

function FeedFilterSelect({
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
  active = false,
  "aria-label": ariaLabel,
  listWidthClass = "w-[var(--radix-popover-trigger-width)]",
}: {
  value: string;
  onChange: (id: string) => void;
  options: { id: string; label: string }[];
  placeholder: string;
  disabled?: boolean;
  active?: boolean;
  "aria-label"?: string;
  listWidthClass?: string;
}) {
  const [open, setOpen] = useState(false);
  const { resetHighlight, optionPointerHandlers, isHighlighted } = useLobbySelectListHighlight();
  const selected = options.find((o) => o.id === value);
  const displayLabel = selected?.id ? selected.label : placeholder;

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) resetHighlight();
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          aria-label={ariaLabel}
          aria-haspopup="listbox"
          aria-expanded={open}
          className={cn(
            feedFieldClass,
            "flex items-center justify-between gap-2 text-right",
            active && "border-brand ring-2 ring-brand/15 text-brand",
          )}
        >
          <span className={cn("min-w-0 flex-1 truncate", !selected?.id && "text-graphite/50")}>
            {displayLabel}
          </span>
          <ChevronDown
            className={cn("size-4 shrink-0 text-graphite/45 transition-transform", open && "rotate-180")}
            aria-hidden
          />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className={cn(feedPopoverClass, listWidthClass)}
        align="start"
        side="bottom"
        sideOffset={8}
        collisionPadding={12}
      >
        <ul role="listbox" className="m-0 list-none p-0">
          {options.map((o) => {
            const isSelected = o.id === value;
            return (
              <li key={o.id || "__all"} role="option" aria-selected={isSelected}>
                <button
                  type="button"
                  className={lobbySelectOptionCls(isSelected, isHighlighted(o.id), "sm")}
                  {...optionPointerHandlers(o.id)}
                  onClick={() => {
                    onChange(o.id);
                    setOpen(false);
                  }}
                >
                  {o.label}
                </button>
              </li>
            );
          })}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

export function FeedSearchBar({
  appliedFilters,
  onSearch,
  loading = false,
  embedded = false,
}: {
  appliedFilters: FeedSearchFilters;
  onSearch: (filters: FeedSearchFilters) => void;
  loading?: boolean;
  embedded?: boolean;
}) {
  const [draft, setDraft] = useState<FeedSearchFilters>(appliedFilters);
  const [priceOpen, setPriceOpen] = useState(false);

  useEffect(() => {
    setDraft(appliedFilters);
  }, [appliedFilters]);

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
    <section
      className={cn("flex flex-col gap-2.5 overflow-visible", !embedded && cn(bubble.cardPad, bubble.shadowCard))}
      aria-label="חיפוש וסינון דירות"
    >
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.5fr)_repeat(3,minmax(0,1fr))_auto] lg:items-center lg:gap-2">
        <div className="relative z-10 min-w-0 overflow-visible sm:col-span-2 lg:col-span-1">
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

        <FeedFilterSelect
          value={draft.propertyTypeId}
          placeholder="סוג הנכס"
          active={Boolean(draft.propertyTypeId)}
          disabled={loading}
          aria-label="סוג הנכס"
          listWidthClass="min-w-[var(--radix-popover-trigger-width)] w-[min(100%,16rem)]"
          options={[
            { id: "", label: "הכל" },
            ...LISTING_PROPERTY_TYPE_OPTIONS.map((o) => ({ id: o.id, label: o.label })),
          ]}
          onChange={(id) => setDraft((prev) => ({ ...prev, propertyTypeId: id }))}
        />

        <Popover open={priceOpen} onOpenChange={setPriceOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              disabled={loading}
              className={cn(
                feedFieldClass,
                "text-right",
                priceActive && "border-brand ring-2 ring-brand/15 text-brand",
              )}
            >
              {pricePillLabel(draft)}
            </button>
          </PopoverTrigger>
          <PopoverContent
            className="z-[200] w-56 rounded-xl border border-slate-200/90 bg-white p-3 shadow-[0_4px_16px_rgba(15,23,42,0.1),0_12px_32px_rgba(15,23,42,0.12)]"
            align="start"
            side="bottom"
            sideOffset={8}
            collisionPadding={12}
          >
            <div className="grid gap-2">
              <div className="grid gap-1">
                <Label htmlFor="feed-min-price" className="text-xs font-semibold text-graphite/70">
                  מינימום (₪)
                </Label>
                <Input
                  id="feed-min-price"
                  inputMode="numeric"
                  className={feedFieldClass}
                  value={draft.minPriceIls ?? ""}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^\d]/g, "");
                    setDraft((prev) => ({ ...prev, minPriceIls: raw ? Number(raw) : null }));
                  }}
                />
              </div>
              <div className="grid gap-1">
                <Label htmlFor="feed-max-price" className="text-xs font-semibold text-graphite/70">
                  מקסימום (₪)
                </Label>
                <Input
                  id="feed-max-price"
                  inputMode="numeric"
                  className={feedFieldClass}
                  value={draft.maxPriceIls ?? ""}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^\d]/g, "");
                    setDraft((prev) => ({ ...prev, maxPriceIls: raw ? Number(raw) : null }));
                  }}
                />
              </div>
              <button
                type="button"
                className="mt-0.5 inline-flex h-8 w-full items-center justify-center rounded-lg border border-slate-200 bg-white text-xs font-semibold text-graphite transition hover:bg-soft"
                onClick={() => setPriceOpen(false)}
              >
                סגור
              </button>
            </div>
          </PopoverContent>
        </Popover>

        <FeedFilterSelect
          value={roomId}
          placeholder="חדרים"
          active={Boolean(roomId)}
          disabled={loading}
          aria-label="מספר חדרים"
          options={FEED_ROOM_FILTER_OPTIONS.map((o) => ({ id: o.id, label: o.label }))}
          onChange={(id) => {
            const rooms = feedSearchFiltersFromRoomId(id);
            setDraft((prev) => ({ ...prev, ...rooms }));
          }}
        />

        <button
          type="button"
          disabled={loading}
          onClick={runSearch}
          className={cn(bubble.btnPrimary, "h-10 shrink-0 rounded-xl px-6 text-sm font-semibold lg:min-w-[5.5rem]")}
        >
          חיפוש
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-2.5">
        {feedSearchFiltersIsActive(appliedFilters) ? (
          <button
            type="button"
            disabled={loading}
            onClick={clearAll}
            className="inline-flex h-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white px-3 text-xs font-semibold text-graphite shadow-sm transition hover:bg-soft"
          >
            נקה סינון
          </button>
        ) : null}
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="מאפיינים">
          {FEED_FEATURE_FILTER_OPTIONS.map((opt) => {
            const on = draft.requiredFeatures.includes(opt.id);
            return (
              <button
                key={opt.id}
                type="button"
                disabled={loading}
                aria-pressed={on}
                className={cn(
                  "shrink-0 rounded-full border px-3 py-1 text-xs font-semibold transition",
                  on
                    ? "border-brand bg-brand text-white shadow-[0_4px_12px_rgba(0,157,224,0.28)]"
                    : "border-slate-100 bg-soft text-graphite/75 hover:border-slate-200 hover:bg-white",
                )}
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
      </div>
    </section>
  );
}
