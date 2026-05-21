/** הודעת שגיאה קריאה מ-Firebase (בלי נקודה מיותרת לפני הטקסט) */
export function formatFirebaseError(err: unknown): string {
  if (err && typeof err === "object") {
    const o = err as { code?: string; message?: string };
    const code = typeof o.code === "string" && o.code.length > 0 ? o.code : "";
    const message =
      typeof o.message === "string" && o.message.length > 0
        ? o.message
        : err instanceof Error
          ? err.message
          : "שגיאה לא ידועה";
    if (code === "permission-denied" || code === "firestore/permission-denied") {
      return "אין הרשאה (Firestore). ודאו שחשבון הצוות מוגדר ב-Firebase (תפקיד צוות ב־Custom Claims או בשדה users.staffRole), ופרסמו כללי Firestore: npm run firebase:deploy";
    }
    if (code === "storage/unauthorized") {
      return "אין הרשאה ל-Storage. התנתקו והתחברו מחדש לאדמין, וודאו שיש תפקיד צוות. אם נמשך: npm run firebase:deploy-storage";
    }
    return code ? `${code}: ${message}` : message;
  }
  if (err instanceof Error) return err.message;
  return "שגיאה לא ידועה";
}
