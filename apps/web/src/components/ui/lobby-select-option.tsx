"use client";

import { useCallback, useState } from "react";
import { cn } from "@/lib/utils";

/** מחלקות פריט ברשימת בחירה — hover מודגש (לא bg-soft שקוף מדי) */
export function lobbySelectOptionCls(
  isSelected: boolean,
  isHovered: boolean,
  size: "sm" | "md" = "sm",
) {
  return cn(
    "block w-full cursor-pointer rounded-lg px-3 py-2.5 text-right outline-none transition-colors duration-75",
    size === "sm" ? "text-sm font-semibold" : "text-[15px] font-medium",
    isSelected
      ? isHovered
        ? "bg-brand/20 text-brand"
        : "bg-brand/10 text-brand"
      : isHovered
        ? "bg-[var(--lobby-blue-soft)] text-graphite"
        : "text-graphite",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/30",
  );
}

/** מעקב אחר שורה מתחת לעכבר — עובד גם כש-hover של Tailwind חלש/חסר */
export function useLobbySelectListHighlight() {
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  const resetHighlight = useCallback(() => setHighlightedId(null), []);

  const optionPointerHandlers = useCallback(
    (id: string) => ({
      onMouseEnter: () => setHighlightedId(id),
      onMouseLeave: () => setHighlightedId(null),
    }),
    [],
  );

  const isHighlighted = useCallback((id: string) => highlightedId === id, [highlightedId]);

  return { highlightedId, resetHighlight, optionPointerHandlers, isHighlighted };
}
