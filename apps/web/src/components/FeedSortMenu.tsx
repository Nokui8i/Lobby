"use client";

import { FEED_SORT_OPTIONS, feedSortTriggerLabel, type FeedSortId } from "@lobby/shared";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

const sortMenuContentClass =
  "z-[200] min-w-[12rem] rounded-xl border border-slate-200/90 bg-white p-1.5 shadow-[0_4px_16px_rgba(15,23,42,0.1),0_12px_32px_rgba(15,23,42,0.12)]";

export function FeedSortMenu({
  value,
  onChange,
  disabled = false,
}: {
  value: FeedSortId;
  onChange: (sortId: FeedSortId) => void;
  disabled?: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-graphite shadow-sm transition",
            "hover:border-brand/35 hover:bg-soft focus-visible:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/15",
            "disabled:pointer-events-none disabled:opacity-50",
          )}
          aria-haspopup="menu"
        >
          {feedSortTriggerLabel(value)}
          <ChevronDown className="size-4 shrink-0 text-graphite/50" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        side="bottom"
        sideOffset={8}
        collisionPadding={12}
        className={sortMenuContentClass}
      >
        {FEED_SORT_OPTIONS.map((opt) => (
          <DropdownMenuItem
            key={opt.id}
            onSelect={() => onChange(opt.id)}
            className={cn(value === opt.id && "bg-brand/10 text-brand")}
          >
            {opt.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
