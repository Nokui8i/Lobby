import { HOME_BANNER_ASPECT } from "@lobby/shared";
import { SiteBannerCarouselSkeleton } from "@/components/banners/SiteBannerCarouselSkeleton";

/** שלד טעינה — שומר את מיכל הבאנר בראש דף הבית */
export function HomeBannerCarouselSkeleton({ className }: { className?: string }) {
  return <SiteBannerCarouselSkeleton aspectRatio={HOME_BANNER_ASPECT} className={className} />;
}
