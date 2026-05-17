/**
 * המרת Timestamp של Firestore למילישניות (לשימוש באתר ובאפליקציה).
 */
export function firestoreTimestampToMillis(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.getTime();
  }

  if (value && typeof value === "object" && "toMillis" in value && typeof (value as { toMillis: () => number }).toMillis === "function") {
    return (value as { toMillis: () => number }).toMillis();
  }

  if (value && typeof value === "object" && "seconds" in value) {
    const seconds = (value as { seconds: number }).seconds;
    return typeof seconds === "number" ? seconds * 1000 : 0;
  }

  return 0;
}

/**
 * תצוגת שעה ליד בועת צ׳אט (אותו פורמט באתר ובמובייל).
 */
export function formatChatMessageTime(createdAt: unknown, locale = "he-IL"): string {
  const ms = firestoreTimestampToMillis(createdAt);
  if (ms <= 0) {
    return "";
  }

  return new Date(ms).toLocaleString(locale, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
