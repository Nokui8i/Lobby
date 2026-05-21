"use client";

import { HOME_BANNER_ASPECT, type HomeBannerSlide } from "@lobby/shared";
import { SiteBannerCarousel } from "@/components/banners/SiteBannerCarousel";

/** קרוסלת באנרים — דף הבית */
export function HomeBannerCarousel({ slides, className }: { slides: HomeBannerSlide[]; className?: string }) {
  return <SiteBannerCarousel slides={slides} className={className} aspectRatio={HOME_BANNER_ASPECT} />;
}
