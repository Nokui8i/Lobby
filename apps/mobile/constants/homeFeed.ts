import { REPORT_REASON_LABELS, type ReportReason } from '@lobby/shared';

export const BANNER_AUTO_SCROLL_MS = 6000;
export const INITIAL_VISIBLE_LISTINGS = 6;
export const LISTINGS_LOAD_STEP = 4;

export const reportReasonOptions = Object.entries(REPORT_REASON_LABELS) as Array<[ReportReason, string]>;

export const footerLinks = [
  'תקנון שימוש',
  'מדיניות פרטיות',
  'הצהרת נגישות',
  'מדיניות דיווחים',
  'הסרת מודעות',
  'יצירת קשר',
];

export const lobbyBanners = [
  {
    id: 'banner-1',
    imageUrl:
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'banner-2',
    imageUrl:
      'https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'banner-3',
    imageUrl:
      'https://images.unsplash.com/photo-1560185007-c5ca9d2c014d?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'banner-4',
    imageUrl:
      'https://images.unsplash.com/photo-1560184897-ae75f418493e?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'banner-5',
    imageUrl:
      'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1200&q=80',
  },
];
