/** זיהוי שגיאות Firebase בלי תלות ב־firebase package */
export function getFirebaseErrorCode(err: unknown): string | null {
  if (err && typeof err === "object" && "code" in err) {
    const code = (err as { code: unknown }).code;
    return typeof code === "string" ? code : null;
  }
  return null;
}

export function shouldFallbackCallableSend(err: unknown): boolean {
  const code = getFirebaseErrorCode(err);
  return code === "permission-denied" || code === "failed-precondition";
}

export function formatLobbySendError(err: unknown, fallback: string): string {
  const code = getFirebaseErrorCode(err);
  if (typeof process !== "undefined" && process.env.NODE_ENV === "development") {
    if (code) {
      return `${fallback} (${code})`;
    }
    if (err instanceof Error && err.message && err.message !== "INTERNAL") {
      return `${fallback} (${err.message})`;
    }
  }
  return fallback;
}

export function logLobbyError(label: string, err: unknown): void {
  if (typeof console !== "undefined") {
    console.error(`[Lobby] ${label}`, err);
  }
}
