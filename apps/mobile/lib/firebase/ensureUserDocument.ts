import type { User } from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { USERS_COLLECTION } from "@lobby/shared";
import { getFirestoreDb } from "./client";

export async function ensureUserDocument(user: User, displayName?: string | null) {
  const db = getFirestoreDb();
  const ref = doc(db, USERS_COLLECTION, user.uid);
  const snap = await getDoc(ref);
  const existingRaw = snap.exists() ? snap.data()?.displayName : undefined;
  const existing =
    typeof existingRaw === "string" && existingRaw.trim().length > 0 ? existingRaw.trim() : "";

  const explicit = displayName?.trim() || "";
  const authName = user.displayName?.trim() || "";
  const emailLocal = user.email?.split("@")[0]?.trim() || "";

  let name = explicit || authName;
  if (!name) {
    name = existing || emailLocal || "משתמש";
  }

  await setDoc(
    ref,
    {
      email: user.email ?? null,
      displayName: name,
      pushNotificationsEnabled: true,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}
