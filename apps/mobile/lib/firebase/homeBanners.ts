import { collection, getDocs, query, where } from 'firebase/firestore';
import {
  HOME_BANNERS_COLLECTION,
  normalizeSiteBannerPlacement,
  normalizeBannerLinkUrl,
  SITE_BANNER_PLACEMENT_HOME,
  type HomeBannerSlide,
} from '@lobby/shared';
import { getFirestoreDb } from './client';

export async function fetchActiveHomeBanners(): Promise<HomeBannerSlide[]> {
  const db = getFirestoreDb();
  const q = query(collection(db, HOME_BANNERS_COLLECTION), where('active', '==', true));
  const snap = await getDocs(q);
  return snap.docs
    .map((docSnap) => {
      const data = docSnap.data();
      const imageUrl = typeof data.imageUrl === 'string' ? data.imageUrl : '';
      if (!imageUrl) return null;
      const sortOrder = typeof data.sortOrder === 'number' ? data.sortOrder : 0;
      const placement = normalizeSiteBannerPlacement(data.placement);
      return {
        id: docSnap.id,
        src: imageUrl,
        alt: typeof data.alt === 'string' && data.alt.trim() ? data.alt : 'באנר',
        linkUrl: typeof data.linkUrl === 'string' ? normalizeBannerLinkUrl(data.linkUrl) : '',
        sortOrder,
        placement,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null && row.placement === SITE_BANNER_PLACEMENT_HOME)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(({ sortOrder: _o, ...slide }) => slide);
}
