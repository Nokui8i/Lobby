import { updateProfile, type User } from "firebase/auth";
import { doc, getDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import { USERS_COLLECTION, validateUserDisplayName } from "@lobby/shared";
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

export async function updateUserDisplayName(user: User, displayName: string): Promise<void> {
  const validated = validateUserDisplayName(displayName);
  if (!validated.ok) {
    const err = new Error(validated.message);
    (err as { code?: string }).code = "lobby/display-name-invalid";
    throw err;
  }
  const name = validated.value;
  const db = getFirestoreDb();
  const authCurrent = user.displayName?.trim() || "";
  if (authCurrent !== name) {
    await updateProfile(user, { displayName: name });
  }
  await updateDoc(doc(db, USERS_COLLECTION, user.uid), {
    displayName: name,
    updatedAt: serverTimestamp(),
  });
}
