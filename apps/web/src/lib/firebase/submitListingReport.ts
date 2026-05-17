import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import type { ReportReason } from "@lobby/shared";
import { LISTING_REPORTS_COLLECTION } from "@lobby/shared";
import { getFirestoreDb } from "./client";

export interface SubmitListingReportInput {
  listingId: string;
  listingTitle: string;
  reporterId: string;
  reason: ReportReason;
  otherDetails?: string;
}

export async function submitListingReport(input: SubmitListingReportInput) {
  const db = getFirestoreDb();
  const payload: Record<string, unknown> = {
    listingId: input.listingId,
    listingTitle: input.listingTitle,
    reporterId: input.reporterId,
    reason: input.reason,
    status: "open",
    createdAt: serverTimestamp(),
  };

  if (input.reason === "other" && input.otherDetails?.trim()) {
    payload.otherDetails = input.otherDetails.trim().slice(0, 100);
  }

  await addDoc(collection(db, LISTING_REPORTS_COLLECTION), payload);
}
