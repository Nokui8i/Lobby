export const USER_DISPLAY_NAME_MAX_LENGTH = 40;

export function normalizeUserDisplayName(raw: string): string {
  return raw.trim().slice(0, USER_DISPLAY_NAME_MAX_LENGTH);
}

export function validateUserDisplayName(
  raw: string,
): { ok: true; value: string } | { ok: false; message: string } {
  const value = normalizeUserDisplayName(raw);
  if (!value) {
    return { ok: false, message: "נא למלא שם להצגה." };
  }
  return { ok: true, value };
}
