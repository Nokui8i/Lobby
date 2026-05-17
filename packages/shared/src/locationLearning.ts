/** מקור שם שכונה במודעה */
export type NeighborhoodSource = "official" | "learned" | "manual" | "none";

export const NEIGHBORHOOD_LEARNING = {
  /** מינימום דיווחים זהים (רחוב+שכונה) לפני תור אדמין */
  minReportsForPending: 2,
  /** אישור אוטומטי לרשימת השלמה */
  autoApproveReports: 5,
  /** אורך שם שכונה ידני */
  manualLabelMin: 2,
  manualLabelMax: 48,
} as const;

export const LOCATION_FIELD_HELP_HE = {
  officialLocked: "המידע הזה מגיע מגוף ממשלתי ולא ניתן לשינוי",
  districtAuto: "מידע זה נקבע אוטומטית על פי הכתובת שהזנת",
  areaAuto: "מידע זה נקבע אוטומטית על פי הכתובת שהזנת",
  learnedHood: "שכונה שנלמדה מפרסומים קודמים באותו רחוב",
  manualHood: "התחילו להקליד — בחרו מהרשימה או המשיכו בשם משלכם. שמות חדשים יילמדו לאחר אימותים",
} as const;

export function normalizeNeighborhoodLabelForKey(label: string): string {
  return label
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[\"'״׳]/g, "")
    .toLowerCase();
}

export function isValidManualNeighborhoodLabel(label: string): boolean {
  const trimmed = label.trim();
  if (
    trimmed.length < NEIGHBORHOOD_LEARNING.manualLabelMin ||
    trimmed.length > NEIGHBORHOOD_LEARNING.manualLabelMax
  ) {
    return false;
  }
  if (/https?:\/\//i.test(trimmed) || /www\./i.test(trimmed)) {
    return false;
  }
  if (/^\d+$/.test(trimmed)) {
    return false;
  }
  return true;
}
