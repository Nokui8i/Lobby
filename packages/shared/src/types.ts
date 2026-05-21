import type { LocationKind } from "./location";

export type ListingStatus =
  | "draft"
  | "pending_review"
  | "active"
  | "frozen"
  | "expired"
  | "rented"
  | "removed";

export type PropertyFeature =
  | "parking"
  | "elevator"
  | "mamad"
  | "balcony"
  | "furnished"
  | "pets"
  | "renovated"
  | "airConditioning";

export type ReportReason =
  | "broker_fee_requested"
  | "broker_or_agent"
  | "fake_listing"
  | "wrong_details"
  | "scam"
  | "offensive_content"
  | "other";

export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  broker_fee_requested: "דרשו ממני דמי תיווך",
  broker_or_agent: "זה מתווך או משרד תיווך",
  fake_listing: "מודעה מזויפת",
  wrong_details: "פרטים לא נכונים",
  scam: "חשד להונאה",
  offensive_content: "תוכן פוגעני",
  other: "משהו אחר",
};

export const REPORT_OTHER_DETAILS_MAX_CHARACTERS = 100;

export interface ListingPublisher {
  id: string;
  displayName: string;
  responseTimeLabel: string;
  /** טלפון ליצירת קשר — מוצג במודעה */
  contactPhone?: string;
}

export const LISTING_MEDIA_LIMITS = {
  maxImages: 12,
  maxVideos: 1,
  maxVideoDurationSeconds: 60,
} as const;

/** יחס מסגרת תמונה בכרטיס פיד (עמוד ראשי) — נמוך ואופקי */
export const LISTING_CARD_IMAGE_ASPECT_RATIO = 16 / 9;

export const LISTING_CARD_IMAGE_ASPECT_LABEL_HE = "16:9";

export const LISTING_DESCRIPTION_MAX_CHARACTERS = 300;

export interface ListingVideo {
  url: string;
  durationSeconds: number;
  thumbnailUrl?: string;
}

export interface RentalListing {
  id: string;
  title: string;
  city: string;
  neighborhood: string;
  /** מזהה Google Places של הבחירה העיקרית */
  placeId?: string;
  locationKind?: LocationKind;
  cityPlaceId?: string;
  neighborhoodPlaceId?: string;
  streetPlaceId?: string;
  districtLabel?: string;
  areaPlaceId?: string;
  areaLabel?: string;
  neighborhoodSource?: import("./locationLearning").NeighborhoodSource;
  lat?: number;
  lng?: number;
  streetHint: string;
  /** רחוב ללא מספר (אם קיים במסמך) */
  streetLine?: string;
  /** מספר בית (אם קיים במסמך) */
  houseNumber?: string;
  /** מזהה סוג נכס מטופס פרסום */
  propertyTypeId?: string;
  /** תווית סוג נכס בעברית */
  propertyTypeLabel?: string;
  /** מזהה מצב נכס */
  propertyConditionId?: string;
  /** תווית מצב נכס בעברית */
  propertyConditionLabel?: string;
  priceIls: number;
  rooms: number;
  sizeSqm: number;
  floor: number;
  totalFloors: number;
  entryDate: string;
  imageUrl: string;
  gallery: string[];
  video?: ListingVideo;
  features: PropertyFeature[];
  description: string;
  status: ListingStatus;
  publishedAt: string;
  expiresAt: string;
  /** הערת צוות כשהמודעה הוחזרה לטיוטה מדיווח */
  moderationDraftNote?: string;
  /** returned_to_draft — נדרשת שליחה מחדש לבדיקת צוות */
  moderationAction?: string;
  /** מילישניות שנותרו מ־30 יום הפרסום (מושהה בטיוטה/בדיקה) */
  publishRemainingMs?: number;
  publisher: ListingPublisher;
}

export interface ListingFilterOption {
  id: string;
  label: string;
}
