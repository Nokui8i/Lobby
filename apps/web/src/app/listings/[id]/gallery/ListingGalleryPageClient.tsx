"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, X } from "lucide-react";
import type { RentalListing } from "@lobby/shared";
import { PageMain } from "@/components/layout/PageMain";
import { cn } from "@/lib/utils";

function dedupeGalleryUrls(imageUrl: string, gallery: string[]): string[] {
  const raw = gallery.filter((u) => typeof u === "string" && u.trim().length > 0).map((u) => u.trim());
  const seen = new Set<string>();
  const out: string[] = [];
  for (const u of raw) {
    if (!seen.has(u)) {
      seen.add(u);
      out.push(u);
    }
  }
  if (out.length > 0) {
    return out;
  }
  const single = imageUrl.trim();
  return single ? [single] : [];
}

function preloadUrls(urls: string[]) {
  for (const url of urls) {
    const img = new window.Image();
    img.decoding = "async";
    img.src = url;
  }
}

export function ListingGalleryPageClient({
  listing,
  initialPhotoIndex = 0,
}: {
  listing: RentalListing;
  initialPhotoIndex?: number;
}) {
  const urls = useMemo(
    () => dedupeGalleryUrls(listing.imageUrl, listing.gallery),
    [listing.imageUrl, listing.gallery],
  );

  const [selected, setSelected] = useState(() =>
    urls.length ? Math.min(Math.max(0, initialPhotoIndex), urls.length - 1) : 0,
  );

  useEffect(() => {
    preloadUrls(urls);
  }, [urls]);

  const selectPhoto = useCallback((index: number) => {
    setSelected(index);
  }, []);

  if (urls.length === 0) {
    return (
      <PageMain>
        <p className="text-sm text-graphite/60">אין תמונות למודעה.</p>
        <Link href={`/listings/${listing.id}`} className="mt-4 text-sm font-semibold text-brand">
          חזרה למודעה
        </Link>
      </PageMain>
    );
  }

  return (
    <div className="min-h-dvh bg-white">
      <header className="sticky top-0 z-10 border-b border-slate-200/90 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link
            href={`/listings/${listing.id}`}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-graphite hover:text-brand"
          >
            <ArrowRight className="h-4 w-4" aria-hidden />
            חזרה למודעה
          </Link>
          <p className="truncate text-sm font-bold text-graphite">{listing.title}</p>
          <Link
            href={`/listings/${listing.id}`}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-soft text-graphite hover:bg-slate-100"
            aria-label="סגירה"
          >
            <X className="h-5 w-5" />
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-[1200px] px-4 pb-10 pt-4 sm:px-6">
        <p className="mb-3 text-center text-sm font-semibold text-graphite/60">
          תמונה {selected + 1} מתוך {urls.length}
        </p>

        <div className="relative mx-auto aspect-[4/3] max-h-[min(56vh,520px)] w-full overflow-hidden rounded-2xl bg-slate-100">
          {urls.map((url, index) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={url}
              src={url}
              alt={index === selected ? `${listing.title} — ${index + 1}` : ""}
              decoding="async"
              className={cn(
                "absolute inset-0 h-full w-full object-contain transition-opacity duration-150",
                index === selected ? "opacity-100" : "pointer-events-none opacity-0",
              )}
            />
          ))}
        </div>

        <section className="mt-8" aria-label="כל התמונות">
          <h1 className="mb-3 text-lg font-bold text-graphite">כל התמונות ({urls.length})</h1>
          <p className="mb-3 text-sm text-graphite/55">לחצו על תמונה לתצוגה גדולה למעלה</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 md:gap-3">
            {urls.map((url, index) => (
              <button
                key={`${url}-${index}`}
                type="button"
                className={cn(
                  "relative aspect-[4/3] overflow-hidden rounded-xl border-2 bg-slate-100 transition",
                  index === selected
                    ? "border-brand ring-2 ring-brand/20"
                    : "border-transparent hover:border-slate-200",
                )}
                onClick={() => selectPhoto(index)}
                aria-label={`תמונה ${index + 1}`}
                aria-current={index === selected}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-0 h-full w-full object-cover object-center"
                />
                <span className="absolute bottom-1.5 end-1.5 rounded-md bg-black/55 px-1.5 py-0.5 text-[11px] font-bold text-white">
                  {index + 1}
                </span>
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
