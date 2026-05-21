import { collection, getDocs, query, where } from "firebase/firestore";
import {
  HOME_BANNERS_COLLECTION,
  normalizeSiteBannerPlacement,
  normalizeBannerLinkUrl,
  type HomeBannerSlide,
  type SiteBannerPlacement,
} from "@lobby/shared";
import { getFirestoreDb } from "./client";

function mapBannerDoc(docSnap: { id: string; data: () => Record<string, unknown> }): (HomeBannerSlide & {
  sortOrder: number;
  placement: SiteBannerPlacement;
}) | null {
  const data = docSnap.data();
  const imageUrl = typeof data.imageUrl === "string" ? data.imageUrl : "";
  if (!imageUrl) return null;
  const sortOrder = typeof data.sortOrder === "number" ? data.sortOrder : 0;
  return {
    id: docSnap.id,
    src: imageUrl,
    alt: typeof data.alt === "string" && data.alt.trim() ? data.alt : "באנר",
    linkUrl:
      typeof data.linkUrl === "string" ? normalizeBannerLinkUrl(data.linkUrl) : "",
    sortOrder,
    placement: normalizeSiteBannerPlacement(data.placement),
  };
}

export async function fetchActiveSiteBanners(
  placement: SiteBannerPlacement,
): Promise<HomeBannerSlide[]> {
  const db = getFirestoreDb();
  const q = query(collection(db, HOME_BANNERS_COLLECTION), where("active", "==", true));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => mapBannerDoc(d))
    .filter((row): row is NonNullable<typeof row> => row !== null && row.placement === placement)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(({ sortOrder: _o, placement: _p, ...slide }) => slide);
}
