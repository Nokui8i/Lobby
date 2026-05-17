import type { ListingFilterOption, RentalListing } from "./types";

export const cityFilters: ListingFilterOption[] = [
  { id: "all", label: "כל הארץ" },
  { id: "tel-aviv", label: "תל אביב" },
  { id: "ramat-gan", label: "רמת גן" },
  { id: "givatayim", label: "גבעתיים" },
  { id: "haifa", label: "חיפה" },
  { id: "beer-sheva", label: "באר שבע" },
];

export const featureLabels: Record<string, string> = {
  parking: "חניה",
  elevator: "מעלית",
  mamad: "ממ״ד",
  balcony: "מרפסת",
  furnished: "מרוהטת",
  pets: "בע״ח",
  renovated: "משופצת",
  airConditioning: "מיזוג",
};

/** ריק — מודעות מגיעות רק מ־Firestore */
export const mockListings: RentalListing[] = [];
