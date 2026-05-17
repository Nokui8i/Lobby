import { doc, getDoc } from "firebase/firestore";
import { USERS_COLLECTION } from "@lobby/shared";
import { getFirestoreDb } from "./client";

export async function fetchUserProfileDisplayName(uid: string): Promise<string | null> {
  const db = getFirestoreDb();
  const snap = await getDoc(doc(db, USERS_COLLECTION, uid));
  if (!snap.exists()) {
    return null;
  }
  const raw = snap.data()?.displayName;
  const s = typeof raw === "string" ? raw.trim() : "";
  return s || null;
}
