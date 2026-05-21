"use client";

import { useEffect, useState } from "react";
import {
  LISTING_SIDEBAR_BANNER_ASPECT,
  prepareCommercialBannerCarousel,
  SITE_BANNER_PLACEMENT_LISTING_SIDEBAR,
  type HomeBannerSlide,
} from "@lobby/shared";
import { SiteBannerCarousel } from "@/components/banners/SiteBannerCarousel";
import { SiteBannerCarouselSkeleton } from "@/components/banners/SiteBannerCarouselSkeleton";
import { fetchActiveSiteBanners } from "@/lib/firebase/siteBanners";
import { isFirebaseConfigured } from "@/lib/firebase/isConfigured";
import { cn } from "@/lib/utils";

type CommercialBannerBundle = {
  slides: HomeBannerSlide[];
  initialIndex: number;
  loadId: number;
};

/** פרסום חיצוני — מתחת לכרטיס המפרסם בעמוד מודעה */
export function ListingSidebarBannersSection({ className }: { className?: string }) {
  const [bundle, setBundle] = useState<CommercialBannerBundle | null>(null);

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      setBundle({ slides: [], initialIndex: 0, loadId: Date.now() });
      return;
    }
    let cancelled = false;
    void fetchActiveSiteBanners(SITE_BANNER_PLACEMENT_LISTING_SIDEBAR)
      .then((rows) => {
        if (cancelled) return;
        const prepared = prepareCommercialBannerCarousel(rows);
        setBundle({ ...prepared, loadId: Date.now() });
      })
      .catch((err) => {
        if (process.env.NODE_ENV === "development") {
          console.error("[Lobby] טעינת באנרי פרסום חיצוני נכשלה:", err);
        }
        if (!cancelled) {
          setBundle({ slides: [], initialIndex: 0, loadId: Date.now() });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (bundle === null) {
    return (
      <div className={cn("mx-auto w-full max-w-[318px]", className)}>
        <SiteBannerCarouselSkeleton aspectRatio={LISTING_SIDEBAR_BANNER_ASPECT} />
      </div>
    );
  }

  if (bundle.slides.length === 0) return null;

  return (
    <div
      className={cn("mx-auto w-full max-w-[318px]", className)}
      aria-label="באנר פרסום"
    >
      <SiteBannerCarousel
        key={bundle.loadId}
        slides={bundle.slides}
        aspectRatio={LISTING_SIDEBAR_BANNER_ASPECT}
        sizes="318px"
        className="rounded-2xl"
        showIndicators={false}
        initialSlideIndex={bundle.initialIndex}
      />
    </div>
  );
}
