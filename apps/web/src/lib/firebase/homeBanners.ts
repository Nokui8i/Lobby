import { SITE_BANNER_PLACEMENT_HOME } from "@lobby/shared";
import type { HomeBannerSlide } from "@lobby/shared";
import { fetchActiveSiteBanners } from "./siteBanners";

export async function fetchActiveHomeBanners(): Promise<HomeBannerSlide[]> {
  return fetchActiveSiteBanners(SITE_BANNER_PLACEMENT_HOME);
}
