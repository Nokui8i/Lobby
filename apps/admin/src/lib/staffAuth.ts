import { parseStaffRoleFromClaims, type StaffRole } from "@lobby/shared";
import type { User } from "firebase/auth";
import { getFunctions, httpsCallable } from "firebase/functions";
import { getFirebaseApp } from "@/lib/firebase/client";

/** UID בעלים — חייב להתאים ל־LOBBY_ADMIN_UIDS ב־Cloud Functions. */
export const PLATFORM_OWNER_UID = "5sTSj3ZRUUe9rNubhuAk8vCOUNK2" as const;

/** UID-ים מורשים בפיתוח בלבד (גיבוי מקומי). */
function devOwnerUids(): Set<string> {
  const raw = process.env.NEXT_PUBLIC_LOBBY_DEV_OWNER_UIDS ?? PLATFORM_OWNER_UID;
  return new Set(
    raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );
}

export async function resolveStaffRoleForAdminUser(user: User): Promise<StaffRole | null> {
  try {
    const fn = httpsCallable<Record<string, never>, { role: StaffRole }>(
      getFunctions(getFirebaseApp(), "us-central1"),
      "lobbyAdminResolveMyStaffRole",
    );
    const result = await fn({});
    if (result.data.role) {
      return result.data.role;
    }
  } catch {
    /* fallback below */
  }

  if (user.uid === PLATFORM_OWNER_UID || devOwnerUids().has(user.uid)) {
    return "owner";
  }

  const token = await user.getIdTokenResult();
  return parseStaffRoleFromClaims(token.claims as Record<string, unknown>);
}
