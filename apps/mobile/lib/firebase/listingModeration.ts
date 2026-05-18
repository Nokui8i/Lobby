import { getFunctions, httpsCallable } from "firebase/functions";
import { getFirebaseApp } from "./client";

export async function submitListingForReview(listingId: string): Promise<void> {
  const fn = httpsCallable<{ listingId: string }, { ok: boolean }>(
    getFunctions(getFirebaseApp(), "us-central1"),
    "lobbySubmitListingForReview",
  );
  await fn({ listingId });
}
