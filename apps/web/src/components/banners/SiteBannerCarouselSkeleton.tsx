"use client";

import { cn } from "@/lib/utils";

export function SiteBannerCarouselSkeleton({
  aspectRatio,
  fixedHeightPx,
  className,
}: {
  aspectRatio: number;
  fixedHeightPx?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-2xl bg-soft shadow-[0_8px_28px_rgba(15,23,42,0.08)]",
        className,
      )}
      aria-hidden
    >
      <div
        className="w-full animate-pulse bg-gradient-to-l from-brand/15 via-muted to-brand/10"
        style={fixedHeightPx != null ? { height: fixedHeightPx } : { aspectRatio }}
      />
    </div>
  );
}
