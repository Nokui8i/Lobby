export const HOME_BANNERS_COLLECTION = "homeBanners" as const;

/**
 * מיקום תצוגה — אותו אוסף Firestore (`homeBanners`), שדה `placement`.
 * - home / listing — פרסום פנימי של לובי
 * - listing_sidebar — פרסום חיצוני (חברות), מתחת לפרטי המפרסם בעמוד מודעה
 */
export type SiteBannerPlacement = "home" | "listing" | "listing_sidebar";

export const SITE_BANNER_PLACEMENT_HOME = "home" as const satisfies SiteBannerPlacement;
/** באנר אופקי בתוכן עמוד המודעה (פרסום לובי) */
export const SITE_BANNER_PLACEMENT_LISTING = "listing" as const satisfies SiteBannerPlacement;
/** באנר אנכי בסרגל — מתחת לכרטיס המפרסם (פרסום חיצוני) */
export const SITE_BANNER_PLACEMENT_LISTING_SIDEBAR =
  "listing_sidebar" as const satisfies SiteBannerPlacement;

export function normalizeSiteBannerPlacement(raw: unknown): SiteBannerPlacement {
  if (raw === SITE_BANNER_PLACEMENT_LISTING_SIDEBAR) {
    return SITE_BANNER_PLACEMENT_LISTING_SIDEBAR;
  }
  if (raw === SITE_BANNER_PLACEMENT_LISTING) {
    return SITE_BANNER_PLACEMENT_LISTING;
  }
  return SITE_BANNER_PLACEMENT_HOME;
}

export function isLobbyOwnedBannerPlacement(placement: SiteBannerPlacement): boolean {
  return placement === SITE_BANNER_PLACEMENT_HOME || placement === SITE_BANNER_PLACEMENT_LISTING;
}

export function isCommercialBannerPlacement(placement: SiteBannerPlacement): boolean {
  return placement === SITE_BANNER_PLACEMENT_LISTING_SIDEBAR;
}

/** נתיב Storage — תיקייה אחת (כללי `home-banners` כבר בפרודקשן); קידומת בשם הקובץ לעמודי מודעה */
export const SITE_BANNER_STORAGE_FOLDER = "home-banners" as const;

export function siteBannerStorageFileName(placement: SiteBannerPlacement, ext: string): string {
  const normalized = ext === "jpeg" ? "jpg" : ext;
  const base = `${Date.now()}.${normalized}`;
  if (placement === SITE_BANNER_PLACEMENT_LISTING_SIDEBAR) {
    return `listing-sidebar-${base}`;
  }
  if (placement === SITE_BANNER_PLACEMENT_LISTING) {
    return `listing-${base}`;
  }
  return base;
}

/** ממד מומלץ אחיד — דף הבית ועמודי מודעה */
export const SITE_BANNER_RECOMMENDED_WIDTH = 2400;
export const SITE_BANNER_RECOMMENDED_HEIGHT = 448;
export const SITE_BANNER_ASPECT = SITE_BANNER_RECOMMENDED_WIDTH / SITE_BANNER_RECOMMENDED_HEIGHT;

/** @deprecated שם היסטורי — אותו יחס כמו SITE_BANNER_ASPECT */
export const HOME_BANNER_ASPECT = SITE_BANNER_ASPECT;
export const LISTING_BANNER_ASPECT = SITE_BANNER_ASPECT;

export const SITE_BANNER_RECOMMENDED_SIZES_HE =
  "מומלץ: 2400×448 (או באותו יחס — למשל 1920×358)";

export const HOME_BANNER_RECOMMENDED_SIZES_HE = SITE_BANNER_RECOMMENDED_SIZES_HE;
export const LISTING_BANNER_RECOMMENDED_SIZES_HE = SITE_BANNER_RECOMMENDED_SIZES_HE;

/** באנר פרסום חיצוני — סרגל עמוד מודעה (מתחת לפרטי המפרסם), ריבוע */
export const LISTING_SIDEBAR_BANNER_SIZE = 680;
export const LISTING_SIDEBAR_BANNER_WIDTH = LISTING_SIDEBAR_BANNER_SIZE;
export const LISTING_SIDEBAR_BANNER_HEIGHT = LISTING_SIDEBAR_BANNER_SIZE;
export const LISTING_SIDEBAR_BANNER_ASPECT = 1;

export const LISTING_SIDEBAR_BANNER_RECOMMENDED_SIZES_HE =
  "מומלץ: 680×680 ריבוע (או 340×340) — מתחת לפרטי המפרסם, רוחב עמודה ~340px";

export const LISTING_SIDEBAR_BANNER_DESIGN_SPECS = {
  aspectLabel: "680×680 (1:1)",
  aspectRatio: LISTING_SIDEBAR_BANNER_ASPECT,
  recommended: [
    { label: "מומלץ", width: LISTING_SIDEBAR_BANNER_SIZE, height: LISTING_SIDEBAR_BANNER_SIZE },
    { label: "אותו יחס, קטן יותר", width: 340, height: 340 },
  ],
  minimum: { width: 300, height: 300 },
  formats: "JPG או PNG",
} as const;

export const SITE_BANNER_DESIGN_SPECS = {
  aspectLabel: "2400×448",
  aspectRatio: SITE_BANNER_ASPECT,
  recommended: [
    { label: "מומלץ", width: SITE_BANNER_RECOMMENDED_WIDTH, height: SITE_BANNER_RECOMMENDED_HEIGHT },
    { label: "אותו יחס, קטן יותר", width: 1920, height: 358 },
  ],
  minimum: { width: 1200, height: 224 },
  formats: "JPG או PNG",
} as const;

export const HOME_BANNER_DESIGN_SPECS = SITE_BANNER_DESIGN_SPECS;
export const LISTING_BANNER_DESIGN_SPECS = SITE_BANNER_DESIGN_SPECS;

/** זמן הצגה לכל באנר לפני מעבר לבא (לא כולל משך האנימציה) */
export const HOME_BANNER_AUTO_MS = 10_000;

export const HOME_BANNER_TRANSITION_MS = 650;

export interface HomeBannerRecord {
  id: string;
  imageUrl: string;
  alt: string;
  linkUrl: string;
  sortOrder: number;
  active: boolean;
  placement: SiteBannerPlacement;
}

export interface HomeBannerSlide {
  id: string;
  src: string;
  alt: string;
  linkUrl: string;
}

/** מנקה קישור לשמירה — ריק = באנר לא לחיץ */
export function normalizeBannerLinkUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) {
    return "";
  }
  if (trimmed.startsWith("/")) {
    return /^\/[^\s]*$/.test(trimmed) ? trimmed : "";
  }
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  const withoutLeadingSlashes = trimmed.replace(/^\/+/, "");
  if (/^[\w.-]+\.[a-z]{2,}/i.test(withoutLeadingSlashes)) {
    return `https://${withoutLeadingSlashes}`;
  }
  return "";
}

export function isBannerLinkClickable(linkUrl: string | undefined | null): boolean {
  return normalizeBannerLinkUrl(linkUrl ?? "").length > 0;
}

/** ערבוב סדר קרוסלה — פרסום חיצוני */
export function shuffleCommercialBannerSlides(slides: HomeBannerSlide[]): HomeBannerSlide[] {
  if (slides.length <= 1) return slides;
  const out = slides.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = out[i]!;
    out[i] = out[j]!;
    out[j] = tmp;
  }
  return out;
}

/** סדר אקראי + באנר ראשון אקראי — בכל טעינת עמוד / ריענון */
export function prepareCommercialBannerCarousel(slides: HomeBannerSlide[]): {
  slides: HomeBannerSlide[];
  initialIndex: number;
} {
  const shuffled = shuffleCommercialBannerSlides(slides);
  const initialIndex =
    shuffled.length <= 1 ? 0 : Math.floor(Math.random() * shuffled.length);
  return { slides: shuffled, initialIndex };
}
