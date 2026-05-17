import { deleteDoc, deleteField, doc, getDoc, Timestamp, updateDoc } from "firebase/firestore";
import { LISTINGS_COLLECTION } from "@lobby/shared";
import { getFirestoreDb } from "./client";
import { deleteListingMediaFromStorage } from "./listingMediaStorage";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

async function assertOwnerListing(listingId: string, publisherId: string) {
  const db = getFirestoreDb();
  const ref = doc(db, LISTINGS_COLLECTION, listingId);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    throw new Error("not_found");
  }
  const data = snap.data() as { publisherId?: string };
  if (data.publisherId !== publisherId) {
    throw new Error("forbidden");
  }
  return ref;
}

export async function deleteOwnerListing(listingId: string, publisherId: string): Promise<void> {
  await assertOwnerListing(listingId, publisherId);
  await deleteListingMediaFromStorage(publisherId, listingId);
  const ref = doc(getFirestoreDb(), LISTINGS_COLLECTION, listingId);
  await deleteDoc(ref);
}

/** לפי מחזור חיים: הושכר → הסרה מהלוח (מחיקת מסמך) */
export async function markOwnerListingRented(listingId: string, publisherId: string): Promise<void> {
  await deleteOwnerListing(listingId, publisherId);
}

export async function freezeOwnerListing(listingId: string, publisherId: string): Promise<void> {
  const ref = await assertOwnerListing(listingId, publisherId);
  const snap = await getDoc(ref);
  const data = snap.data() as { status?: string };
  if (data.status !== "active") {
    throw new Error("invalid_status");
  }
  await updateDoc(ref, { status: "frozen" });
}

export async function unfreezeOwnerListing(listingId: string, publisherId: string): Promise<void> {
  const ref = await assertOwnerListing(listingId, publisherId);
  const snap = await getDoc(ref);
  const data = snap.data() as { status?: string; expiresAt?: unknown };
  if (data.status !== "frozen") {
    throw new Error("invalid_status");
  }
  const expiresMs =
    data.expiresAt && typeof (data.expiresAt as { toMillis?: () => number }).toMillis === "function"
      ? (data.expiresAt as { toMillis: () => number }).toMillis()
      : 0;
  if (expiresMs > 0 && expiresMs <= Date.now()) {
    throw new Error("expired");
  }
  await updateDoc(ref, { status: "active" });
}

export async function renewOwnerListing(listingId: string, publisherId: string): Promise<void> {
  const ref = await assertOwnerListing(listingId, publisherId);
  await updateDoc(ref, {
    status: "active",
    expiresAt: Timestamp.fromMillis(Date.now() + THIRTY_DAYS_MS),
    expiryReminderSent: false,
    expiredAt: deleteField(),
  });
}
