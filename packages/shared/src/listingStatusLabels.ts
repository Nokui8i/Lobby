import type { ListingStatus } from "./types";

export const LISTING_STATUS_LABEL_HE: Record<ListingStatus, string> = {
  active: "פעילה",
  frozen: "מוקפאת",
  draft: "טיוטה",
  pending_review: "בבדיקת צוות",
  expired: "פגה",
  removed: "הוסרה",
  rented: "הושכר",
};
