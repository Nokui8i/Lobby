const { HttpsError } = require("firebase-functions/v2/https");
const { getFirestore, FieldValue, Timestamp } = require("firebase-admin/firestore");
const { requireStaff } = require("./adminStaff");
const {
  MS_DAY,
  LISTING_PUBLISH_MS,
  timestampToMillis,
  computePublishRemainingMs,
} = require("./listingPublishTime");

const ADMIN_MODERATION_DRAFT_NOTE_MAX = 500;
const { buildModerationUpdateNotificationBody } = require("./notificationCopy");

async function createModerationNotification(db, params) {
  await db.collection("notifications").add({
    userId: params.userId,
    fromUserId: "lobby",
    kind: "system",
    title: params.title,
    body: params.body,
    read: false,
    listingId: params.listingId || "",
    listingTarget: params.listingTarget || "view",
    threadId: "",
    createdAt: FieldValue.serverTimestamp(),
  });
}

async function submitListingForReviewHandler(request) {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "יש להתחבר.");
  }
  const listingId = typeof request.data?.listingId === "string" ? request.data.listingId.trim() : "";
  if (!listingId) {
    throw new HttpsError("invalid-argument", "מזהה מודעה חסר.");
  }

  const db = getFirestore();
  const listingRef = db.collection("listings").doc(listingId);
  const listingSnap = await listingRef.get();
  if (!listingSnap.exists) {
    throw new HttpsError("not-found", "המודעה לא נמצאה.");
  }

  const listing = listingSnap.data();
  const publisherId = String(listing.publisherId ?? "");
  if (publisherId !== request.auth.uid) {
    throw new HttpsError("permission-denied", "אין הרשאה למודעה זו.");
  }

  if (listing.status !== "draft") {
    throw new HttpsError("failed-precondition", "ניתן לשלוח לבדיקה רק מודעה בטיוטה.");
  }

  const moderationAction = String(listing.moderationAction ?? "");
  if (moderationAction !== "returned_to_draft") {
    throw new HttpsError(
      "failed-precondition",
      "שליחה לבדיקת צוות זמינה רק אחרי בקשת תיקון מהמערכת.",
    );
  }

  const remainingMs = computePublishRemainingMs(listing);
  const now = FieldValue.serverTimestamp();

  await listingRef.set(
    {
      status: "pending_review",
      publishRemainingMs: remainingMs,
      moderationResubmittedAt: now,
      updatedAt: now,
      expiryReminderSent: false,
    },
    { merge: true },
  );

  return { ok: true, listingId, status: "pending_review" };
}

function serializePendingListing(docSnap) {
  const data = docSnap.data();
  const remainingMs =
    typeof data.publishRemainingMs === "number" && data.publishRemainingMs > 0
      ? data.publishRemainingMs
      : LISTING_PUBLISH_MS;
  return {
    id: docSnap.id,
    title: String(data.title ?? "מודעה"),
    publisherId: String(data.publisherId ?? ""),
    resubmittedAtMs: timestampToMillis(data.moderationResubmittedAt),
    publishRemainingDays: Math.max(1, Math.ceil(remainingMs / MS_DAY)),
  };
}

async function adminListPendingListingsHandler(request) {
  requireStaff(request);
  const db = getFirestore();
  const snap = await db.collection("listings").where("status", "==", "pending_review").limit(80).get();
  const listings = snap.docs.map(serializePendingListing);
  listings.sort((a, b) => b.resubmittedAtMs - a.resubmittedAtMs);
  return {
    listings: listings.map((row) => ({
      ...row,
      resubmittedAt: row.resubmittedAtMs > 0 ? new Date(row.resubmittedAtMs).toISOString() : "",
    })),
  };
}

async function adminDecidePendingListingHandler(request) {
  const staffUid = requireStaff(request);
  const listingId = typeof request.data?.listingId === "string" ? request.data.listingId.trim() : "";
  const decision = typeof request.data?.decision === "string" ? request.data.decision.trim() : "";
  const rejectNote =
    typeof request.data?.rejectNote === "string" ? request.data.rejectNote.trim() : "";

  if (!listingId || !["approve", "reject"].includes(decision)) {
    throw new HttpsError("invalid-argument", "בקשה לא תקינה.");
  }

  if (decision === "reject") {
    if (rejectNote.length < 5) {
      throw new HttpsError("invalid-argument", "יש לכתוב הסבר למפרסם (לפחות 5 תווים).");
    }
    if (rejectNote.length > ADMIN_MODERATION_DRAFT_NOTE_MAX) {
      throw new HttpsError(
        "invalid-argument",
        `ההסבר ארוך מדי (עד ${ADMIN_MODERATION_DRAFT_NOTE_MAX} תווים).`,
      );
    }
  }

  const db = getFirestore();
  const listingRef = db.collection("listings").doc(listingId);
  const listingSnap = await listingRef.get();
  if (!listingSnap.exists) {
    throw new HttpsError("not-found", "המודעה לא נמצאה.");
  }

  const listing = listingSnap.data();
  if (listing.status !== "pending_review") {
    throw new HttpsError("failed-precondition", "המודעה אינה ממתינה לאישור.");
  }

  const publisherId = String(listing.publisherId ?? "");
  const listingTitle = String(listing.title ?? "מודעה");
  const now = FieldValue.serverTimestamp();

  if (decision === "approve") {
    const remainingMs = computePublishRemainingMs(listing);
    const expiresAt = Timestamp.fromMillis(Date.now() + remainingMs);
    await listingRef.set(
      {
        status: "active",
        expiresAt,
        publishedAt: listing.publishedAt ?? now,
        publishRemainingMs: FieldValue.delete(),
        moderationAction: FieldValue.delete(),
        moderationDraftNote: FieldValue.delete(),
        moderationResubmittedAt: FieldValue.delete(),
        moderatedAt: now,
        moderatedBy: staffUid,
        updatedAt: now,
        expiryReminderSent: false,
      },
      { merge: true },
    );
    if (publisherId) {
      await createModerationNotification(db, {
        userId: publisherId,
        listingId,
        listingTarget: "view",
        title: "המודעה אושרה וחזרה ללוח",
        body: `${listingTitle} פעילה שוב בלובי. נותרו כ־${Math.max(1, Math.ceil(remainingMs / MS_DAY))} ימי פרסום.`,
      });
    }
  } else {
    await listingRef.set(
      {
        status: "draft",
        moderationAction: "returned_to_draft",
        moderationDraftNote: rejectNote.slice(0, ADMIN_MODERATION_DRAFT_NOTE_MAX),
        moderationResubmittedAt: FieldValue.delete(),
        moderatedAt: now,
        moderatedBy: staffUid,
        updatedAt: now,
      },
      { merge: true },
    );
    if (publisherId) {
      await createModerationNotification(db, {
        userId: publisherId,
        listingId,
        listingTarget: "publish",
        title: "נדרש עדכון נוסף למודעה",
        body: buildModerationUpdateNotificationBody(
          rejectNote.slice(0, ADMIN_MODERATION_DRAFT_NOTE_MAX),
        ),
      });
    }
  }

  return { ok: true, listingId, decision };
}

module.exports = {
  submitListingForReviewHandler,
  adminListPendingListingsHandler,
  adminDecidePendingListingHandler,
};
