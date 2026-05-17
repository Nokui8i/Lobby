import { doc, getDoc } from "firebase/firestore";
import type { User } from "firebase/auth";
import { parseUserBannedFromClaims, USERS_COLLECTION } from "@lobby/shared";
import { getFirestoreDb } from "./client";

export async function isLobbyUserBanned(user: User): Promise<boolean> {
  try {
    const token = await user.getIdTokenResult();
    if (parseUserBannedFromClaims(token.claims as Record<string, unknown>)) {
      return true;
    }
  } catch {
    /* fall through to Firestore */
  }

  try {
    const snap = await getDoc(doc(getFirestoreDb(), USERS_COLLECTION, user.uid));
    return snap.exists() && snap.data()?.banned === true;
  } catch {
    return false;
  }
}
