import { getFunctions, httpsCallable } from "firebase/functions";
import { getFirebaseApp } from "./client";

function lobbyFunctions() {
  return getFunctions(getFirebaseApp(), "us-central1");
}

export async function deleteMyChatThread(threadId: string): Promise<void> {
  const fn = httpsCallable<{ threadId: string }, { ok: boolean }>(
    lobbyFunctions(),
    "lobbyDeleteMyChatThread",
  );
  await fn({ threadId });
}

export async function deleteMySupportInquiry(inquiryId: string): Promise<void> {
  const fn = httpsCallable<{ inquiryId: string }, { ok: boolean }>(
    lobbyFunctions(),
    "lobbyDeleteMySupportInquiry",
  );
  await fn({ inquiryId });
}
