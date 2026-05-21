"use client";

import { FEED_SORT_OPTIONS, feedSortTriggerLabel, type FeedSortId } from "@lobby/shared";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";

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
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={disabled}
          className="h-auto gap-1 border-0 bg-transparent px-0 py-0 text-sm font-semibold text-graphite shadow-none hover:bg-transparent hover:text-graphite/75"
        >
          {feedSortTriggerLabel(value)}
          <ChevronDown className="size-4 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {FEED_SORT_OPTIONS.map((opt) => (
          <DropdownMenuItem
            key={opt.id}
            onSelect={() => onChange(opt.id)}
            className={value === opt.id ? "bg-accent" : undefined}
          >
            {opt.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
