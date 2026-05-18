const { HttpsError } = require("firebase-functions/v2/https");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { assertUserNotBanned } = require("./supportInquiries");
const { deleteChatMessagesBatch } = require("./chatMessagesBatch");

const CHAT_THREADS_COLLECTION = "chatThreads";

async function deleteMyChatThreadHandler(request) {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "יש להתחבר.");
  }

  const threadId = typeof request.data?.threadId === "string" ? request.data.threadId.trim() : "";
  if (!threadId) {
    throw new HttpsError("invalid-argument", "מזהה שיחה חסר.");
  }

  const uid = request.auth.uid;
  await assertUserNotBanned(uid);

  const db = getFirestore();
  const ref = db.collection(CHAT_THREADS_COLLECTION).doc(threadId);
  const snap = await ref.get();
  if (!snap.exists) {
    return { ok: true };
  }

  const data = snap.data() || {};
  const participantIds = Array.isArray(data.participantIds)
    ? data.participantIds.filter((id) => typeof id === "string")
    : [];
  if (!participantIds.includes(uid)) {
    throw new HttpsError("permission-denied", "אין גישה לשיחה זו.");
  }

  const deletedSet = new Set(
    Array.isArray(data.deletedByUids) ? data.deletedByUids.filter((id) => typeof id === "string") : [],
  );
  deletedSet.add(uid);

  const allParticipantsDeleted =
    participantIds.length > 0 && participantIds.every((id) => deletedSet.has(id));

  if (allParticipantsDeleted) {
    await deleteChatMessagesBatch(ref);
    await ref.delete();
  } else {
    await ref.update({
      deletedByUids: FieldValue.arrayUnion(uid),
    });
  }

  return { ok: true };
}

module.exports = { deleteMyChatThreadHandler };
