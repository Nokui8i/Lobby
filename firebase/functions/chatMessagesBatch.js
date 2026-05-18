/** מחיקת הודעות בשרשור — משותף ל־cleanup ולמחיקה ידנית */
async function deleteChatMessagesBatch(threadRef) {
  const db = threadRef.firestore;
  let deleted = 0;
  while (true) {
    const msgSnap = await threadRef.collection("messages").limit(400).get();
    if (msgSnap.empty) {
      break;
    }
    const batch = db.batch();
    for (const msgDoc of msgSnap.docs) {
      batch.delete(msgDoc.ref);
    }
    await batch.commit();
    deleted += msgSnap.size;
    if (msgSnap.size < 400) {
      break;
    }
  }
  return deleted;
}

module.exports = { deleteChatMessagesBatch };
