import type { ListingStatus } from "./types";

export type ListingOwnerActionId =
  | "view"
  | "edit"
  | "continue_publish"
  | "renew"
  | "boost"
  | "freeze"
  | "unfreeze"
  | "mark_rented"
  | "delete";

export const LISTING_OWNER_ACTION_LABEL_HE: Record<ListingOwnerActionId, string> = {
  view: "צפייה במודעה",
  edit: "עריכה",
  continue_publish: "המשך פרסום",
  renew: "חידוש מודעה",
  boost: "קידום (Boost)",
  freeze: "הקפאת מודעה",
  unfreeze: "החזרה לפרסום",
  mark_rented: "סימון כהושכר",
  delete: "מחיקה",
};

export interface ListingOwnerActionConfirm {
  title: string;
  body: string;
  confirmLabel?: string;
}

export const LISTING_OWNER_ACTION_CONFIRM_HE: Partial<
  Record<ListingOwnerActionId, ListingOwnerActionConfirm>
> = {
  freeze: {
    title: "הקפאת מודעה",
    body:
      "המודעה תרד מהלוח אך תישאר באזור האישי. תקופת ה-30 יום ממשיכה לרוץ — בסוף התקופה המודעה תימחק גם אם הוקפאה.",
    confirmLabel: "הקפא",
  },
  unfreeze: {
    title: "החזרה לפרסום",
    body: "המודעה תחזור להופיע בלוח לשוכרים (כל עוד לא פג תוקף הפרסום).",
    confirmLabel: "החזר לפרסום",
  },
  mark_rented: {
    title: "סימון כהושכר",
    body: "המודעה תוסר מהלוח ולא יינתן החזר על דמי פרסום. להמשיך?",
    confirmLabel: "כן, הושכר",
  },
  delete: {
    title: "מחיקת מודעה",
    body: "המודעה והמדיה יימחקו לצמיתות. לא ניתן לבטל.",
    confirmLabel: "מחק",
  },
  renew: {
    title: "חידוש מודעה",
    body: "המודעה תחזור ללוח ל-30 יום נוספים.",
    confirmLabel: "חדש",
  },
};

export const LISTING_OWNER_ACTION_BOOST_INFO_HE: ListingOwnerActionConfirm = {
  title: "קידום (Boost)",
  body: "קידום מודעות יהיה זמין בקרוב — כולל תשלום מאובטח.",
  confirmLabel: "הבנתי",
};

/** פעולות זמינות לבעל המודעה לפי סטטוס */
export function listingOwnerActionsForStatus(status: ListingStatus): ListingOwnerActionId[] {
  switch (status) {
    case "active":
      return ["view", "edit", "freeze", "boost", "mark_rented", "delete"];
    case "frozen":
      return ["view", "unfreeze", "edit", "delete"];
    case "draft":
      return ["view", "continue_publish", "delete"];
    case "pending_review":
      return ["view"];
    case "expired":
      return ["view", "renew", "edit", "delete"];
    case "rented":
    case "removed":
      return ["view", "delete"];
    default:
      return ["view", "delete"];
  }
}

export function listingOwnerActionIsDestructive(action: ListingOwnerActionId): boolean {
  return action === "delete" || action === "mark_rented";
}
