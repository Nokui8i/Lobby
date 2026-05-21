"use client";

import { useEffect, useState } from "react";
import { LISTING_BANNER_ASPECT, SITE_BANNER_PLACEMENT_LISTING, type HomeBannerSlide } from "@lobby/shared";
import { SiteBannerCarousel } from "@/components/banners/SiteBannerCarousel";
import { SiteBannerCarouselSkeleton } from "@/components/banners/SiteBannerCarouselSkeleton";
import { fetchActiveSiteBanners } from "@/lib/firebase/siteBanners";
import { isFirebaseConfigured } from "@/lib/firebase/isConfigured";
import { cn } from "@/lib/utils";

/** באנר לובי אופקי בתוכן המודעה — מנוהלים באדמין תחת «עמוד מודעה · לובי» */
export function ListingBannersSection({ className }: { className?: string }) {
  const [slides, setSlides] = useState<HomeBannerSlide[] | null>(null);

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      setSlides([]);
      return;
    }
    let cancelled = false;
    void fetchActiveSiteBanners(SITE_BANNER_PLACEMENT_LISTING)
      .then((rows) => {
        if (!cancelled) setSlides(rows);
      })
      .catch((err) => {
        if (process.env.NODE_ENV === "development") {
          console.error("[Lobby] טעינת באנרי עמוד מודעה נכשלה:", err);
        }
        if (!cancelled) setSlides([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (slides === null) {
    return (
      <div className={cn("mx-auto w-full max-w-[800px]", className)}>
        <SiteBannerCarouselSkeleton aspectRatio={LISTING_BANNER_ASPECT} />
      </div>
    );
  }

  if (slides.length === 0) return null;

  return (
    <div className={cn("mx-auto w-full max-w-[800px]", className)}>
      <SiteBannerCarousel
        slides={slides}
        aspectRatio={LISTING_BANNER_ASPECT}
        sizes="(max-width: 800px) 100vw, 800px"
      />
    </div>
  );
}
