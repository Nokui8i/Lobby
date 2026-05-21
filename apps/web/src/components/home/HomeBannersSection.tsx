"use client";

import { useEffect, useState } from "react";
import type { HomeBannerSlide } from "@lobby/shared";
import { fetchActiveHomeBanners } from "@/lib/firebase/homeBanners";
import { isFirebaseConfigured } from "@/lib/firebase/isConfigured";
import { HomeBannerCarousel } from "@/components/home/HomeBannerCarousel";
import { HomeBannerCarouselSkeleton } from "@/components/home/HomeBannerCarouselSkeleton";

export function HomeBannersSection({ className }: { className?: string }) {
  const [slides, setSlides] = useState<HomeBannerSlide[] | null>(null);

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      setSlides([]);
      return;
    }
    let cancelled = false;
    void fetchActiveHomeBanners()
      .then((rows) => {
        if (!cancelled) setSlides(rows);
      })
      .catch((err) => {
        if (process.env.NODE_ENV === "development") {
          console.error("[Lobby] טעינת באנרי דף הבית נכשלה:", err);
        }
        if (!cancelled) setSlides([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (slides === null) {
    return <HomeBannerCarouselSkeleton className={className} />;
  }

  if (slides.length === 0) return null;

  return <HomeBannerCarousel slides={slides} className={className} />;
}
