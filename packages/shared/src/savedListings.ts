/** תת-אוסף: users/{userId}/savedListings/{listingId} */
export const SAVED_LISTINGS_SUBCOLLECTION = "savedListings" as const;

export const SAVED_LISTINGS_TITLE_HE = "מודעות שאהבתי" as const;

export const SAVED_LISTINGS_EMPTY_HE = "הרשימה שלך עדיין ריקה" as const;

export const SAVED_LISTINGS_HINT_HE =
  "אפשר להוסיף מודעות לרשימה בלחיצה על הלב בפינת הכרטיס או בעמוד הדירה" as const;

export const SAVED_LISTINGS_LOGIN_HE = "יש להתחבר כדי לשמור מודעות שאהבת" as const;

export const SAVED_LISTING_REMOVED_HE = "המודעה כבר לא זמינה בלוח" as const;

export interface SavedListingRecord {
  listingId: string;
  listingTitle: string;
  imageUrl: string;
  priceIls: number;
  savedAtMs: number;
}
