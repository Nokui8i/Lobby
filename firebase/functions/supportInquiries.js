const { HttpsError } = require("firebase-functions/v2/https");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { requireStaffRole, staffRoleFromAuth } = require("./adminStaff");

const SUPPORT_INQUIRIES_COLLECTION = "supportInquiries";
const SUPPORT_INQUIRY_COUNTER_DOC = "counters/supportInquiries";
const SUPPORT_INQUIRY_REFERENCE_START = 100001;

const SUBJECT_MAX = 120;
const MESSAGE_MAX = 2000;
const STAFF_NOTE_MAX = 1000;
const MAX_OPEN_PER_USER = 5;
const PREVIEW_MAX = 140;
const REOPEN_MS = 48 * 60 * 60 * 1000;

const CATEGORY_LABELS = {
  account: "חשבון והתחברות",
  listing: "מודעה / פרסום",
  technical: "תקלה טכנית",
  safety: "בטיחות / הונאה",
  accessibility: "נגישות",
  other: "אחר",
};

const VALID_CATEGORIES = Object.keys(CATEGORY_LABELS);

function normalizeStatus(raw) {
  if (raw === "closed" || raw === "resolved") {
    return "closed";
  }
  return "open";
}

function timestampToIso(value) {
  if (!value) {
    return "";
  }
  if (typeof value.toDate === "function") {
    return value.toDate().toISOString();
  }
  if (typeof value === "string") {
    return value;
  }
  return "";
}

function messagePreview(text) {
  const trimmed = text.trim();
  if (trimmed.length <= PREVIEW_MAX) {
    return trimmed;
  }
  return `${trimmed.slice(0, PREVIEW_MAX)}…`;
}

function serializeMessageDoc(id, data) {
  const senderRole = data.senderRole === "staff" ? "staff" : "user";
  return {
    id,
    senderId: typeof data.senderId === "string" ? data.senderId : "",
    senderRole,
    text: typeof data.text === "string" ? data.text : "",
    createdAt: timestampToIso(data.createdAt),
  };
}

function serializeInquiryDoc(id, data) {
  const category = typeof data.category === "string" ? data.category : "other";
  const safeCategory = VALID_CATEGORIES.includes(category) ? category : "other";
  const referenceNumber =
    typeof data.referenceNumber === "number" && data.referenceNumber > 0
      ? Math.floor(data.referenceNumber)
      : 0;
  const lastMessageSenderRole =
    data.lastMessageSenderRole === "staff" ? "staff" : data.lastMessageSenderRole === "user" ? "user" : "";
  const closedByRole = data.closedByRole === "staff" ? "staff" : data.closedByRole === "user" ? "user" : "";

  return {
    id,
    referenceNumber,
    userId: typeof data.userId === "string" ? data.userId : "",
    userEmail: typeof data.userEmail === "string" ? data.userEmail : "",
    displayName: typeof data.displayName === "string" ? data.displayName : "",
    category: safeCategory,
    categoryLabel: CATEGORY_LABELS[safeCategory] ?? safeCategory,
    subject: typeof data.subject === "string" ? data.subject : "",
    listingId: typeof data.listingId === "string" ? data.listingId : "",
    listingTitle: typeof data.listingTitle === "string" ? data.listingTitle : "",
    status: normalizeStatus(data.status),
    lastMessagePreview:
      typeof data.lastMessagePreview === "string"
        ? data.lastMessagePreview
        : typeof data.body === "string"
          ? messagePreview(data.body)
          : "",
    lastMessageSenderRole,
    unreadForUser: typeof data.unreadForUser === "number" ? Math.max(0, data.unreadForUser) : 0,
    unreadForStaff: typeof data.unreadForStaff === "number" ? Math.max(0, data.unreadForStaff) : 0,
    userResolvedAt: timestampToIso(data.userResolvedAt),
    assignedToUid: typeof data.assignedToUid === "string" ? data.assignedToUid : "",
    assignedToDisplayName:
      typeof data.assignedToDisplayName === "string" ? data.assignedToDisplayName : "",
    staffNote: typeof data.staffNote === "string" ? data.staffNote : "",
    closedByUid: typeof data.closedByUid === "string" ? data.closedByUid : "",
    closedByRole,
    createdAt: timestampToIso(data.createdAt),
    updatedAt: timestampToIso(data.updatedAt),
    closedAt: timestampToIso(data.closedAt),
  };
}

async function assertUserNotBanned(uid) {
  const authRecord = await getAuth()
    .getUser(uid)
    .catch(() => null);
  if (authRecord?.customClaims?.banned === true) {
    throw new HttpsError("permission-denied", "החשבון חסום.");
  }
  const db = getFirestore();
  const userSnap = await db.collection("users").doc(uid).get();
  if (userSnap.exists && userSnap.data()?.banned === true) {
    throw new HttpsError("permission-denied", "החשבון חסום.");
  }
}

function isStaffAuth(auth) {
  return staffRoleFromAuth(auth) !== null;
}

async function getInquiryOrThrow(db, inquiryId) {
  const ref = db.collection(SUPPORT_INQUIRIES_COLLECTION).doc(inquiryId);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new HttpsError("not-found", "פנייה לא נמצאה.");
  }
  return { ref, data: snap.data(), inquiry: serializeInquiryDoc(snap.id, snap.data()) };
}

function assertCanAccessInquiry(auth, inquiryData) {
  const uid = auth?.uid;
  if (!uid) {
    throw new HttpsError("unauthenticated", "לא מחובר.");
  }
  if (inquiryData.userId === uid || isStaffAuth(auth)) {
    return { uid, isStaff: isStaffAuth(auth) };
  }
  throw new HttpsError("permission-denied", "אין גישה לפנייה זו.");
}

function assertInquiryOpen(data) {
  if (normalizeStatus(data.status) !== "open") {
    throw new HttpsError("failed-precondition", "הפנייה סגורה.");
  }
}

async function countOpenInquiriesForUser(db, userId) {
  const snap = await db
    .collection(SUPPORT_INQUIRIES_COLLECTION)
    .where("userId", "==", userId)
    .where("status", "==", "open")
    .get();
  return snap.size;
}

async function allocateSupportInquiryReference(db) {
  const counterRef = db.doc(SUPPORT_INQUIRY_COUNTER_DOC);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(counterRef);
    const next =
      snap.exists && typeof snap.data()?.next === "number"
        ? Math.floor(snap.data().next)
        : SUPPORT_INQUIRY_REFERENCE_START;
    if (next < SUPPORT_INQUIRY_REFERENCE_START) {
      throw new Error("invalid support inquiry counter");
    }
    tx.set(counterRef, { next: next + 1 }, { merge: true });
    return next;
  });
}

async function appendSupportMessage(db, inquiryRef, inquiryData, senderId, senderRole, text) {
  const trimmed = text.trim();
  if (!trimmed || trimmed.length > MESSAGE_MAX) {
    throw new HttpsError("invalid-argument", `הודעה: בין 1 ל־${MESSAGE_MAX} תווים.`);
  }

  const preview = messagePreview(trimmed);
  const msgRef = inquiryRef.collection("messages").doc();
  await msgRef.set({
    senderId,
    senderRole,
    text: trimmed,
    createdAt: FieldValue.serverTimestamp(),
  });

  const patch = {
    updatedAt: FieldValue.serverTimestamp(),
    lastMessageAt: FieldValue.serverTimestamp(),
    lastMessagePreview: preview,
    lastMessageSenderId: senderId,
    lastMessageSenderRole: senderRole,
  };

  if (senderRole === "staff" && inquiryData.userId) {
    patch.unreadForUser = FieldValue.increment(1);
    patch.unreadForStaff = 0;
  }
  if (senderRole === "user") {
    patch.unreadForStaff = FieldValue.increment(1);
    patch.userResolvedAt = null;
  }

  await inquiryRef.update(patch);
  return msgRef.id;
}

async function submitSupportInquiryHandler(request) {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "יש להתחבר כדי לשלוח פנייה.");
  }
  const uid = request.auth.uid;
  await assertUserNotBanned(uid);

  const category = typeof request.data?.category === "string" ? request.data.category.trim() : "";
  const subject = typeof request.data?.subject === "string" ? request.data.subject.trim() : "";
  const body = typeof request.data?.body === "string" ? request.data.body.trim() : "";
  const listingId = typeof request.data?.listingId === "string" ? request.data.listingId.trim() : "";
  const listingTitle =
    typeof request.data?.listingTitle === "string" ? request.data.listingTitle.trim().slice(0, 120) : "";

  if (!VALID_CATEGORIES.includes(category)) {
    throw new HttpsError("invalid-argument", "נא לבחור קטגוריה.");
  }
  if (subject.length < 2 || subject.length > SUBJECT_MAX) {
    throw new HttpsError("invalid-argument", `נושא: בין 2 ל־${SUBJECT_MAX} תווים.`);
  }
  if (body.length < 10 || body.length > MESSAGE_MAX) {
    throw new HttpsError("invalid-argument", `הודעה ראשונה: בין 10 ל־${MESSAGE_MAX} תווים.`);
  }

  const db = getFirestore();
  const openCount = await countOpenInquiriesForUser(db, uid);
  if (openCount >= MAX_OPEN_PER_USER) {
    throw new HttpsError(
      "resource-exhausted",
      "יש לכם מספר פניות פתוחות. סגרו פנייה קודמת או המתינו לתשובה לפני פנייה חדשה.",
    );
  }

  const authRecord = await getAuth().getUser(uid);
  const userSnap = await db.collection("users").doc(uid).get();
  const profile = userSnap.data() || {};
  const displayName =
    typeof profile.displayName === "string" && profile.displayName.trim()
      ? profile.displayName.trim()
      : authRecord.displayName?.trim() || "משתמש";
  const userEmail = authRecord.email ?? "";

  let resolvedListingTitle = listingTitle;
  if (listingId && !resolvedListingTitle) {
    const listingSnap = await db.collection("listings").doc(listingId).get();
    if (listingSnap.exists) {
      const listingData = listingSnap.data();
      resolvedListingTitle =
        typeof listingData.title === "string" ? listingData.title.slice(0, 120) : "";
    }
  }

  const referenceNumber = await allocateSupportInquiryReference(db);
  const preview = messagePreview(body);

  const ref = await db.collection(SUPPORT_INQUIRIES_COLLECTION).add({
    referenceNumber,
    userId: uid,
    userEmail,
    displayName,
    category,
    subject,
    listingId: listingId || "",
    listingTitle: resolvedListingTitle || "",
    status: "open",
    lastMessagePreview: preview,
    lastMessageSenderId: uid,
    lastMessageSenderRole: "user",
    unreadForUser: 0,
    unreadForStaff: 1,
    userResolvedAt: null,
    assignedToUid: "",
    assignedToDisplayName: "",
    staffNote: "",
    closedByUid: "",
    closedByRole: "",
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    closedAt: null,
  });

  await ref.collection("messages").add({
    senderId: uid,
    senderRole: "user",
    text: body,
    createdAt: FieldValue.serverTimestamp(),
  });

  return { ok: true, inquiryId: ref.id, referenceNumber };
}

async function sendSupportInquiryMessageHandler(request) {
  const inquiryId = typeof request.data?.inquiryId === "string" ? request.data.inquiryId.trim() : "";
  const text = typeof request.data?.text === "string" ? request.data.text : "";
  if (!inquiryId) {
    throw new HttpsError("invalid-argument", "מזהה פנייה חסר.");
  }

  const db = getFirestore();
  const { ref, data } = await getInquiryOrThrow(db, inquiryId);
  const { uid, isStaff } = assertCanAccessInquiry(request.auth, data);
  assertInquiryOpen(data);
  await assertUserNotBanned(uid);

  const senderRole = isStaff ? "staff" : "user";
  if (isStaff && !data.assignedToUid) {
    const staffRecord = await getAuth().getUser(uid).catch(() => null);
    const staffName = staffRecord?.displayName?.trim() || "צוות";
    await ref.update({
      assignedToUid: uid,
      assignedToDisplayName: staffName,
    });
  }
  await appendSupportMessage(db, ref, data, uid, senderRole, text);

  return { ok: true };
}

async function closeSupportInquiryHandler(request) {
  const inquiryId = typeof request.data?.inquiryId === "string" ? request.data.inquiryId.trim() : "";
  if (!inquiryId) {
    throw new HttpsError("invalid-argument", "מזהה פנייה חסר.");
  }

  const db = getFirestore();
  const { ref, data } = await getInquiryOrThrow(db, inquiryId);
  const { uid, isStaff } = assertCanAccessInquiry(request.auth, data);
  if (!isStaff) {
    throw new HttpsError("permission-denied", "רק צוות התמיכה יכול לסגור פנייה.");
  }
  if (normalizeStatus(data.status) === "closed") {
    return { ok: true, inquiry: serializeInquiryDoc(ref.id, data) };
  }

  await ref.update({
    status: "closed",
    closedByUid: uid,
    closedByRole: "staff",
    closedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    unreadForStaff: 0,
  });

  const updated = await ref.get();
  return { ok: true, inquiry: serializeInquiryDoc(updated.id, updated.data()) };
}

async function markSupportInquiryResolvedHandler(request) {
  const inquiryId = typeof request.data?.inquiryId === "string" ? request.data.inquiryId.trim() : "";
  if (!inquiryId) {
    throw new HttpsError("invalid-argument", "מזהה פנייה חסר.");
  }
  const db = getFirestore();
  const { ref, data } = await getInquiryOrThrow(db, inquiryId);
  const { uid, isStaff } = assertCanAccessInquiry(request.auth, data);
  if (isStaff) {
    throw new HttpsError("permission-denied", "פעולה למשתמש בלבד.");
  }
  if (data.userId !== uid) {
    throw new HttpsError("permission-denied", "אין גישה.");
  }
  assertInquiryOpen(data);
  await ref.update({
    userResolvedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  const updated = await ref.get();
  return { ok: true, inquiry: serializeInquiryDoc(updated.id, updated.data()) };
}

async function reopenSupportInquiryHandler(request) {
  requireStaffRole(request, "moderator");
  const inquiryId = typeof request.data?.inquiryId === "string" ? request.data.inquiryId.trim() : "";
  if (!inquiryId) {
    throw new HttpsError("invalid-argument", "מזהה פנייה חסר.");
  }
  const db = getFirestore();
  const { ref, data } = await getInquiryOrThrow(db, inquiryId);
  if (normalizeStatus(data.status) !== "closed") {
    return { ok: true, inquiry: serializeInquiryDoc(ref.id, data) };
  }
  const closedMs = data.closedAt?.toDate ? data.closedAt.toDate().getTime() : Date.parse(timestampToIso(data.closedAt));
  if (!Number.isFinite(closedMs) || Date.now() - closedMs > REOPEN_MS) {
    throw new HttpsError("failed-precondition", "ניתן לפתוח מחדש רק בתוך 48 שעות מסגירה.");
  }
  await ref.update({
    status: "open",
    closedByUid: "",
    closedByRole: "",
    closedAt: null,
    userResolvedAt: null,
    updatedAt: FieldValue.serverTimestamp(),
  });
  const updated = await ref.get();
  return { ok: true, inquiry: serializeInquiryDoc(updated.id, updated.data()) };
}

async function claimSupportInquiryHandler(request) {
  const { staffUid } = requireStaffRole(request, "moderator");
  const inquiryId = typeof request.data?.inquiryId === "string" ? request.data.inquiryId.trim() : "";
  if (!inquiryId) {
    throw new HttpsError("invalid-argument", "מזהה פנייה חסר.");
  }
  const db = getFirestore();
  const { ref, data } = await getInquiryOrThrow(db, inquiryId);
  if (data.assignedToUid && data.assignedToUid !== staffUid) {
    return { ok: true, inquiry: serializeInquiryDoc(ref.id, data), alreadyAssigned: true };
  }
  const staffRecord = await getAuth().getUser(staffUid).catch(() => null);
  const staffName = staffRecord?.displayName?.trim() || "צוות";
  await ref.update({
    assignedToUid: staffUid,
    assignedToDisplayName: staffName,
    updatedAt: FieldValue.serverTimestamp(),
  });
  const updated = await ref.get();
  return { ok: true, inquiry: serializeInquiryDoc(updated.id, updated.data()), alreadyAssigned: false };
}

async function markSupportInquiryReadHandler(request) {
  const inquiryId = typeof request.data?.inquiryId === "string" ? request.data.inquiryId.trim() : "";
  if (!inquiryId) {
    throw new HttpsError("invalid-argument", "מזהה פנייה חסר.");
  }
  const db = getFirestore();
  const { ref, data } = await getInquiryOrThrow(db, inquiryId);
  const { uid, isStaff } = assertCanAccessInquiry(request.auth, data);
  const patch = {};
  if (data.userId === uid) {
    patch.unreadForUser = 0;
  }
  if (isStaff) {
    patch.unreadForStaff = 0;
  }
  if (Object.keys(patch).length > 0) {
    await ref.update(patch);
  }
  return { ok: true };
}

async function listMySupportInquiriesHandler(request) {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "לא מחובר.");
  }
  const db = getFirestore();
  const snap = await db
    .collection(SUPPORT_INQUIRIES_COLLECTION)
    .where("userId", "==", request.auth.uid)
    .orderBy("updatedAt", "desc")
    .limit(50)
    .get();
  const inquiries = snap.docs.map((docSnap) => serializeInquiryDoc(docSnap.id, docSnap.data()));
  return { inquiries };
}

async function adminListSupportInquiriesHandler(request) {
  requireStaffRole(request, "moderator");
  const db = getFirestore();
  const snap = await db
    .collection(SUPPORT_INQUIRIES_COLLECTION)
    .orderBy("updatedAt", "desc")
    .limit(500)
    .get();
  const inquiries = snap.docs.map((docSnap) => serializeInquiryDoc(docSnap.id, docSnap.data()));
  return { inquiries };
}

async function adminUpdateSupportInquiryHandler(request) {
  const { staffUid, role } = requireStaffRole(request, "moderator");
  const inquiryId = typeof request.data?.inquiryId === "string" ? request.data.inquiryId.trim() : "";
  const staffNote = typeof request.data?.staffNote === "string" ? request.data.staffNote.trim() : "";

  if (!inquiryId) {
    throw new HttpsError("invalid-argument", "מזהה פנייה חסר.");
  }
  if (!staffNote) {
    throw new HttpsError("invalid-argument", "אין שינוי.");
  }
  if (role === "moderator") {
    throw new HttpsError("permission-denied", "רק מנהל יכול לערוך הערה פנימית.");
  }
  if (staffNote.length > STAFF_NOTE_MAX) {
    throw new HttpsError("invalid-argument", `הערה פנימית: עד ${STAFF_NOTE_MAX} תווים.`);
  }

  const db = getFirestore();
  const { ref } = await getInquiryOrThrow(db, inquiryId);
  await ref.update({
    staffNote,
    updatedAt: FieldValue.serverTimestamp(),
    handledByStaffUid: staffUid,
  });
  const updated = await ref.get();
  return { ok: true, inquiry: serializeInquiryDoc(updated.id, updated.data()) };
}

/** @deprecated — סגירה דרך closeSupportInquiry */
async function adminResolveSupportInquiryHandler(request) {
  return closeSupportInquiryHandler(request);
}

async function countOpenInquiries(db) {
  const snap = await db.collection(SUPPORT_INQUIRIES_COLLECTION).where("status", "==", "open").get();
  return snap.size;
}

async function deleteMySupportInquiryHandler(request) {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "יש להתחבר.");
  }

  const inquiryId = typeof request.data?.inquiryId === "string" ? request.data.inquiryId.trim() : "";
  if (!inquiryId) {
    throw new HttpsError("invalid-argument", "מזהה פנייה חסר.");
  }

  const uid = request.auth.uid;
  await assertUserNotBanned(uid);

  const db = getFirestore();
  const { ref, data } = await getInquiryOrThrow(db, inquiryId);
  if (data.userId !== uid) {
    throw new HttpsError("permission-denied", "אין גישה לפנייה זו.");
  }

  await deleteSupportInquiryMessages(ref);
  await ref.delete();
  return { ok: true };
}

async function deleteSupportInquiryMessages(inquiryRef) {
  const db = inquiryRef.firestore;
  let deleted = 0;
  while (true) {
    const msgSnap = await inquiryRef.collection("messages").limit(400).get();
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

module.exports = {
  submitSupportInquiryHandler,
  sendSupportInquiryMessageHandler,
  closeSupportInquiryHandler,
  markSupportInquiryResolvedHandler,
  reopenSupportInquiryHandler,
  claimSupportInquiryHandler,
  markSupportInquiryReadHandler,
  listMySupportInquiriesHandler,
  adminListSupportInquiriesHandler,
  adminUpdateSupportInquiryHandler,
  adminResolveSupportInquiryHandler,
  deleteMySupportInquiryHandler,
  assertUserNotBanned,
  countOpenInquiries,
  deleteSupportInquiryMessages,
  serializeInquiryDoc,
  serializeMessageDoc,
};
