import type { RentalListing } from "./types";

/** כותרת מודעה לפרסום — מגבלה מוצרית */
export const LISTING_TITLE_MAX_CHARACTERS = 30;

export type ListingPropertyTypeOption = { id: string; label: string };

export const LISTING_PROPERTY_TYPE_OPTIONS: ListingPropertyTypeOption[] = [
  { id: "apartment", label: "דירה" },
  { id: "garden_apartment", label: "דירת גן" },
  { id: "private_house", label: "בית פרטי/ קוטג'" },
  { id: "roof_penthouse", label: "גג/ פנטהאוז" },
  { id: "plots", label: "מגרשים" },
  { id: "duplex", label: "דופלקס" },
  { id: "tourism", label: "תיירות ונופש" },
  { id: "semi_detached", label: "דו משפחתי" },
  { id: "basement_parterre", label: "מרתף/ פרטר" },
  { id: "triplex", label: "טריפלקס" },
  { id: "housing_unit", label: "יחידת דיור" },
  { id: "farm_estate", label: "משק חקלאי/ נחלה" },
  { id: "auxiliary_farm", label: "משק עזר" },
  { id: "assisted_living", label: "דיור מוגן" },
  { id: "apartment_swap", label: "החלפת דירות" },
  { id: "sublet", label: "סאבלט" },
  { id: "residential_building", label: "בניין מגורים (את הבניין כולו)" },
  { id: "studio_loft", label: "סטודיו/ לופט" },
  { id: "warehouse", label: "מחסן" },
  { id: "purchase_group", label: "קב' רכישה/ זכות לנכס" },
  { id: "parking", label: "חניה" },
  { id: "general", label: "כללי" },
];

export type ListingPropertyConditionOption = { id: string; label: string };

export const LISTING_PROPERTY_CONDITION_OPTIONS: ListingPropertyConditionOption[] = [
  { id: "new_developer", label: "חדש מקבלן (לא גרו בו בכלל)" },
  { id: "new_ten_years", label: "חדש (נכס בן עד 10 שנים)" },
  { id: "renovated_5y", label: "משופץ (שופץ ב-5 השנים האחרונות)" },
  { id: "preserved_good", label: "במצב שמור (במצב טוב, לא שופץ)" },
  { id: "needs_renovation", label: "דרוש שיפוץ (זקוק לעבודת שיפוץ)" },
];

export function listingPropertyTypeLabel(id: string): string {
  return LISTING_PROPERTY_TYPE_OPTIONS.find((o) => o.id === id)?.label ?? id;
}

export function listingPropertyConditionLabel(id: string): string {
  return LISTING_PROPERTY_CONDITION_OPTIONS.find((o) => o.id === id)?.label ?? id;
}

/** שורת מיקום אחת לתצוגה (תואם גם מודעות ישנות בלי streetLine/houseNumber) */
export function formatListingLocationLine(
  listing: Pick<RentalListing, "city" | "neighborhood" | "streetHint" | "streetLine" | "houseNumber">,
): string {
  const streetCombined = [listing.streetLine?.trim(), listing.houseNumber?.trim()].filter(Boolean).join(" ").trim();
  const street = streetCombined || listing.streetHint.trim();
  const parts = [street, listing.neighborhood.trim(), listing.city.trim()].filter((p) => p.length > 0);
  return parts.join(", ");
}
