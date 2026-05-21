import { LISTING_CARD_IMAGE_ASPECT_CLASS, LISTING_FEED_GRID_CLASS } from "@/components/listings/listingCardStyles";
import { cn } from "@/lib/utils";

export function ListingCardSkeleton() {
  return (
    <article
      className="listing-card-surface overflow-hidden rounded-[12px] border border-slate-200/80 bg-white"
      aria-hidden
    >
      <div className={cn("w-full animate-pulse bg-slate-100", LISTING_CARD_IMAGE_ASPECT_CLASS)} />
      <div className="space-y-1 px-2 py-1.5">
        <div className="ms-auto h-3.5 w-16 animate-pulse rounded bg-slate-100" />
        <div className="h-3 w-full animate-pulse rounded bg-slate-100" />
        <div className="h-2.5 max-w-[70%] animate-pulse rounded bg-slate-100" />
      </div>
    </article>
  );
}

export function ListingFeedSkeleton({ count = 10, className }: { count?: number; className?: string }) {
  return (
    <div className={cn(LISTING_FEED_GRID_CLASS, className)} aria-busy="true" aria-label="טוען מודעות">
      {Array.from({ length: count }, (_, i) => (
        <ListingCardSkeleton key={i} />
      ))}
    </div>
  );
}
