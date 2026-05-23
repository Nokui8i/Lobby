/** תיבת הודעות בתוך האזור האישי */
export const ACCOUNT_MESSAGES_BASE_PATH = "/account/messages";

export function accountMessagesIndexPath(): string {
  return ACCOUNT_MESSAGES_BASE_PATH;
}

export function accountMessagesThreadPath(routeId: string): string {
  return `${ACCOUNT_MESSAGES_BASE_PATH}/${encodeURIComponent(routeId)}`;
}

export function isAccountMessagesPath(pathname: string): boolean {
  return (
    pathname === ACCOUNT_MESSAGES_BASE_PATH ||
    pathname.startsWith(`${ACCOUNT_MESSAGES_BASE_PATH}/`)
  );
}

export function parseAccountMessagesThreadId(pathname: string): string | null {
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] === "account" && parts[1] === "messages" && parts.length >= 3) {
    try {
      return decodeURIComponent(parts[2] ?? "");
    } catch {
      return parts[2] ?? null;
    }
  }
  return null;
}

/** נתיב ישן — להפניות ותאימות */
export function parseLegacyChatThreadId(pathname: string): string | null {
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] === "chat" && parts.length >= 2) {
    try {
      return decodeURIComponent(parts[1] ?? "");
    } catch {
      return parts[1] ?? null;
    }
  }
  return null;
}

export function parseMessagesThreadIdFromPath(pathname: string): string | null {
  return parseAccountMessagesThreadId(pathname) ?? parseLegacyChatThreadId(pathname);
}

export function isMessagesWorkspacePath(pathname: string): boolean {
  return isAccountMessagesPath(pathname) || pathname === "/chat" || pathname.startsWith("/chat/");
}
