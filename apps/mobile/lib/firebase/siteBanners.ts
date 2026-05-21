import { collection, getDocs, query, where } from 'firebase/firestore';
import {
  HOME_BANNERS_COLLECTION,
  normalizeSiteBannerPlacement,
  normalizeBannerLinkUrl,
  SITE_BANNER_PLACEMENT_LISTING,
  SITE_BANNER_PLACEMENT_LISTING_SIDEBAR,
  type HomeBannerSlide,
  type SiteBannerPlacement,
} from '@lobby/shared';
import { getFirestoreDb } from './client';

function mapBannerDoc(
  docSnap: { id: string; data: () => Record<string, unknown> },
  placementFilter: SiteBannerPlacement,
): (HomeBannerSlide & { sortOrder: number }) | null {
  const data = docSnap.data();
  const imageUrl = typeof data.imageUrl === 'string' ? data.imageUrl : '';
  if (!imageUrl) return null;
  const placement = normalizeSiteBannerPlacement(data.placement);
  if (placement !== placementFilter) return null;
  const sortOrder = typeof data.sortOrder === 'number' ? data.sortOrder : 0;
  return {
    id: docSnap.id,
    src: imageUrl,
    alt: typeof data.alt === 'string' && data.alt.trim() ? data.alt : 'באנר',
    linkUrl: typeof data.linkUrl === 'string' ? normalizeBannerLinkUrl(data.linkUrl) : '',
    sortOrder,
  };
}

async function fetchActiveBannersForPlacement(placement: SiteBannerPlacement): Promise<HomeBannerSlide[]> {
  const db = getFirestoreDb();
  const q = query(collection(db, HOME_BANNERS_COLLECTION), where('active', '==', true));
  const snap = await getDocs(q);
  return snap.docs
    .map((docSnap) => mapBannerDoc(docSnap, placement))
    .filter((row): row is NonNullable<typeof row> => row !== null)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(({ sortOrder: _o, ...slide }) => slide);
}

/** באנר אופקי בתוכן המודעה — פרסום לובי */
export async function fetchActiveListingBanners(): Promise<HomeBannerSlide[]> {
  return fetchActiveBannersForPlacement(SITE_BANNER_PLACEMENT_LISTING);
}

/** מתחת לפרטי המפרסם — פרסום חיצוני */
export async function fetchActiveListingSidebarBanners(): Promise<HomeBannerSlide[]> {
  return fetchActiveBannersForPlacement(SITE_BANNER_PLACEMENT_LISTING_SIDEBAR);
}
