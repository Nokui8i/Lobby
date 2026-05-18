import { getFunctions, httpsCallable } from "firebase/functions";
import {
  shouldFallbackCallableSend,
  type SupportInquiryCategory,
  type SupportInquiryRecord,
  type SupportInquirySenderRole,
} from "@lobby/shared";
import { getAuth } from "firebase/auth";
import { getFirebaseApp, getFirestoreDb } from "./client";
import { sendSupportInquiryMessageDirect } from "./supportInquiryThread";

export type SubmitSupportInquiryInput = {
  category: SupportInquiryCategory;
  subject: string;
  body: string;
  listingId?: string;
  listingTitle?: string;
};

export type SubmitSupportInquiryResult = {
  inquiryId: string;
  referenceNumber: number;
};

function lobbyFunctions() {
  return getFunctions(getFirebaseApp(), "us-central1");
}

export async function submitSupportInquiry(
  input: SubmitSupportInquiryInput,
): Promise<SubmitSupportInquiryResult> {
  const fn = httpsCallable<
    SubmitSupportInquiryInput,
    { ok: boolean; inquiryId: string; referenceNumber: number }
  >(lobbyFunctions(), "lobbySubmitSupportInquiry");
  const result = await fn(input);
  return {
    inquiryId: result.data.inquiryId,
    referenceNumber: result.data.referenceNumber,
  };
}

export async function listMySupportInquiries(): Promise<SupportInquiryRecord[]> {
  const fn = httpsCallable<Record<string, never>, { inquiries: SupportInquiryRecord[] }>(
    lobbyFunctions(),
    "lobbyListMySupportInquiries",
  );
  const result = await fn({});
  return result.data.inquiries;
}

export async function sendSupportInquiryMessage(
  inquiryId: string,
  text: string,
  senderRole: SupportInquirySenderRole = "user",
  staffAssign?: { assignedToUid: string; assignedToDisplayName: string },
): Promise<void> {
  const auth = getAuth(getFirebaseApp());
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error("UNAUTHENTICATED");
  }
  await auth.authStateReady();
  await currentUser.getIdToken();

  try {
    await sendSupportInquiryMessageDirect(
      getFirestoreDb(),
      inquiryId,
      currentUser.uid,
      senderRole,
      text,
      staffAssign,
    );
  } catch (err) {
    if (!shouldFallbackCallableSend(err) || senderRole !== "user") {
      throw err;
    }
    const fn = httpsCallable<{ inquiryId: string; text: string }, { ok: boolean }>(
      lobbyFunctions(),
      "lobbySendSupportInquiryMessage",
    );
    await fn({ inquiryId, text });
  }
}

export async function markSupportInquiryResolved(inquiryId: string): Promise<SupportInquiryRecord> {
  const fn = httpsCallable<{ inquiryId: string }, { ok: boolean; inquiry: SupportInquiryRecord }>(
    lobbyFunctions(),
    "lobbyMarkSupportInquiryResolved",
  );
  const result = await fn({ inquiryId });
  return result.data.inquiry;
}

export async function markSupportInquiryRead(inquiryId: string): Promise<void> {
  const fn = httpsCallable<{ inquiryId: string }, { ok: boolean }>(
    lobbyFunctions(),
    "lobbyMarkSupportInquiryRead",
  );
  await fn({ inquiryId });
}
