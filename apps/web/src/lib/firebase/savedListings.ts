import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  type Unsubscribe,
} from "firebase/firestore";
import {
  SAVED_LISTINGS_SUBCOLLECTION,
  USERS_COLLECTION,
  type SavedListingRecord,
} from "@lobby/shared";
import { getFirestoreDb } from "./client";

export type SavedListingSnapshot = {
  listingId: string;
  listingTitle: string;
  imageUrl?: string;
  priceIls?: number;
};

function savedListingDocRef(userId: string, listingId: string) {
  return doc(getFirestoreDb(), USERS_COLLECTION, userId, SAVED_LISTINGS_SUBCOLLECTION, listingId);
}

export function subscribeSavedListingIds(
  userId: string,
  onIds: (ids: Set<string>) => void,
  onError?: (err: unknown) => void,
): Unsubscribe {
  const q = query(
    collection(getFirestoreDb(), USERS_COLLECTION, userId, SAVED_LISTINGS_SUBCOLLECTION),
    orderBy("savedAt", "desc"),
  );
  return onSnapshot(
    q,
    (snap) => {
      const ids = new Set<string>();
      for (const docSnap of snap.docs) {
        ids.add(docSnap.id);
      }
      onIds(ids);
    },
    (err) => onError?.(err),
  );
}

export async function fetchSavedListingRecords(userId: string): Promise<SavedListingRecord[]> {
  const q = query(
    collection(getFirestoreDb(), USERS_COLLECTION, userId, SAVED_LISTINGS_SUBCOLLECTION),
    orderBy("savedAt", "desc"),
  );
  const snap = await getDocs(q);
  const rows: SavedListingRecord[] = [];
  for (const docSnap of snap.docs) {
    const data = docSnap.data();
    const savedAt = data.savedAt;
    const savedAtMs =
      savedAt && typeof savedAt.toMillis === "function" ? savedAt.toMillis() : Date.now();
    rows.push({
      listingId: docSnap.id,
      listingTitle: typeof data.listingTitle === "string" ? data.listingTitle : "",
      imageUrl: typeof data.imageUrl === "string" ? data.imageUrl : "",
      priceIls: typeof data.priceIls === "number" ? data.priceIls : 0,
      savedAtMs,
    });
  }
  return rows;
}

export async function saveListingForUser(
  userId: string,
  snapshot: SavedListingSnapshot,
): Promise<void> {
  await setDoc(savedListingDocRef(userId, snapshot.listingId), {
    listingId: snapshot.listingId,
    listingTitle: snapshot.listingTitle.trim().slice(0, 120),
    imageUrl: snapshot.imageUrl?.trim() ?? "",
    priceIls: typeof snapshot.priceIls === "number" ? snapshot.priceIls : 0,
    savedAt: serverTimestamp(),
  });
}

export async function unsaveListingForUser(userId: string, listingId: string): Promise<void> {
  await deleteDoc(savedListingDocRef(userId, listingId));
}

export async function toggleSavedListing(
  userId: string,
  snapshot: SavedListingSnapshot,
  currentlySaved: boolean,
): Promise<boolean> {
  if (currentlySaved) {
    await unsaveListingForUser(userId, snapshot.listingId);
    return false;
  }
  await saveListingForUser(userId, snapshot);
  return true;
}
