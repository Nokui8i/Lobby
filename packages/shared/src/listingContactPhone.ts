/** נרמול מספר ישראלי לשמירה (05XXXXXXXX) */
export function normalizeListingContactPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 0) {
    return "";
  }
  if (digits.startsWith("972") && digits.length >= 11) {
    return `0${digits.slice(3, 12)}`;
  }
  if (digits.startsWith("05") && digits.length === 10) {
    return digits;
  }
  if (digits.length === 9 && digits.startsWith("5")) {
    return `0${digits}`;
  }
  return digits;
}

export function formatListingContactPhoneDisplay(phone: string): string {
  const n = normalizeListingContactPhone(phone);
  if (n.length === 10) {
    return `${n.slice(0, 3)}-${n.slice(3, 6)}-${n.slice(6)}`;
  }
  return phone.trim();
}

/** אובייקט publisher לשמירה ב-Firestore */
export function listingPublisherFirestoreRecord(input: {
  publisherId: string;
  publisherDisplayName: string;
  contactPhone: string;
}): {
  id: string;
  displayName: string;
  responseTimeLabel: string;
  contactPhone: string;
} {
  return {
    id: input.publisherId,
    displayName: input.publisherDisplayName.trim() || "מפרסם",
    responseTimeLabel: "—",
    contactPhone: normalizeListingContactPhone(input.contactPhone),
  };
}

export function listingContactPhoneValidationError(raw: string): string | null {
  const n = normalizeListingContactPhone(raw);
  if (!n) {
    return "נא להזין מספר טלפון ליצירת קשר.";
  }
  if (!/^05\d{8}$/.test(n)) {
    return "מספר נייד ישראלי תקין — 10 ספרות, מתחיל ב־05.";
  }
  return null;
}
