const { HttpsError } = require("firebase-functions/v2/https");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore, FieldValue, Timestamp } = require("firebase-admin/firestore");
const { requireStaff, requireStaffRole } = require("./adminStaff");
const { computePublishRemainingMs, timestampToMillis } = require("./listingPublishTime");
const { buildModerationUpdateNotificationBody } = require("./notificationCopy");
const { adminDecidePendingListingHandler } = require("./listingModeration");

const ADMIN_MODERATION_DRAFT_NOTE_MAX = 500;
const LISTING_DESCRIPTION_MAX = 300;
const LISTING_TITLE_MAX = 120;

const STATUS_LABELS = {
  draft: "טיוטה",
  pending_review: "בבדיקת צוות",
  active: "פעילה",
  frozen: "מוקפאת",
  expired: "פגה",
  rented: "הושכרה",
  removed: "הוסרה",
};

const VALID_STATUSES = new Set(Object.keys(STATUS_LABELS));

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

function locationLine(data) {
  const parts = [data.city, data.neighborhood, data.streetLine || data.streetHint]
    .filter((p) => typeof p === "string" && p.trim());
  return parts.join(", ") || String(data.city ?? "");
}

async function enrichPublisherProfiles(db, publisherIds) {
  const unique = [...new Set(publisherIds.filter(Boolean))];
  const map = new Map();
  await Promise.all(
    unique.map(async (uid) => {
      try {
        const [userSnap, authUser] = await Promise.all([
          db.collection("users").doc(uid).get(),
          getAuth().getUser(uid).catch(() => null),
        ]);
        const userData = userSnap.exists ? userSnap.data() : {};
        map.set(uid, {
          email: authUser?.email ?? "",
          displayName:
            String(userData.displayName ?? "").trim() ||
            String(authUser?.displayName ?? "").trim() ||
            "—",
        });
      } catch {
        map.set(uid, { email: "", displayName: "—" });
      }
    }),
  );
  return map;
}

function serializeListingRow(docSnap, publisherProfile) {
  const data = docSnap.data();
  const status = VALID_STATUSES.has(data.status) ? data.status : "draft";
  const publisherId = String(data.publisherId ?? "");
  return {
    id: docSnap.id,
    title: String(data.title ?? ""),
    city: String(data.city ?? ""),
    neighborhood: String(data.neighborhood ?? ""),
    priceIls: typeof data.priceIls === "number" ? data.priceIls : 0,
    status,
    statusLabel: STATUS_LABELS[status] ?? status,
    publisherId,
    publisherEmail: publisherProfile?.email ?? "",
    publisherDisplayName: publisherProfile?.displayName ?? "—",
    imageUrl: String(data.imageUrl ?? data.gallery?.[0] ?? ""),
    updatedAt: timestampToIso(data.updatedAt),
    expiresAt: timestampToIso(data.expiresAt),
    publishRemainingMs:
      typeof data.publishRemainingMs === "number" && data.publishRemainingMs > 0
        ? data.publishRemainingMs
        : undefined,
    moderationDraftNote:
      typeof data.moderationDraftNote === "string" ? data.moderationDraftNote : undefined,
    locationLine: locationLine(data),
  };
}

function serializeListingDetail(docSnap, publisherProfile) {
  const row = serializeListingRow(docSnap, publisherProfile);
  const data = docSnap.data();
  return {
    ...row,
    rooms: typeof data.rooms === "number" ? data.rooms : 0,
    sizeSqm: typeof data.sizeSqm === "number" ? data.sizeSqm : 0,
    floor: typeof data.floor === "number" ? data.floor : 0,
    totalFloors: typeof data.totalFloors === "number" ? data.totalFloors : 0,
    entryDate: String(data.entryDate ?? "מיידי"),
    description: String(data.description ?? ""),
    propertyTypeId: String(data.propertyTypeId ?? ""),
    propertyConditionId: String(data.propertyConditionId ?? ""),
    features: Array.isArray(data.features) ? data.features.filter((f) => typeof f === "string") : [],
    gallery: Array.isArray(data.gallery)
      ? data.gallery.filter((u) => typeof u === "string")
      : row.imageUrl
        ? [row.imageUrl]
        : [],
    moderationAction: typeof data.moderationAction === "string" ? data.moderationAction : undefined,
  };
}

async function adminListListingsHandler(request) {
  requireStaffRole(request, "moderator");
  const publisherId =
    typeof request.data?.publisherId === "string" ? request.data.publisherId.trim() : "";
  const listingId = typeof request.data?.listingId === "string" ? request.data.listingId.trim() : "";
  const statusRaw = typeof request.data?.status === "string" ? request.data.status.trim() : "";
  const search =
    typeof request.data?.search === "string" ? request.data.search.trim().toLowerCase() : "";

  const status = VALID_STATUSES.has(statusRaw) ? statusRaw : "";

  const db = getFirestore();
  let docs = [];

  if (listingId) {
    const snap = await db.collection("listings").doc(listingId).get();
    if (snap.exists) {
      docs = [snap];
    }
  } else if (publisherId) {
    const snap = await db.collection("listings").where("publisherId", "==", publisherId).limit(80).get();
    docs = snap.docs;
    docs.sort((a, b) => timestampToMillis(b.data().updatedAt) - timestampToMillis(a.data().updatedAt));
  } else if (status) {
    const snap = await db
      .collection("listings")
      .where("status", "==", status)
      .orderBy("updatedAt", "desc")
      .limit(100)
      .get();
    docs = snap.docs;
  } else {
    const snap = await db.collection("listings").orderBy("updatedAt", "desc").limit(100).get();
    docs = snap.docs;
  }

  if (search) {
    docs = docs.filter((docSnap) => {
      const data = docSnap.data();
      const hay = [
        docSnap.id,
        data.title,
        data.city,
        data.neighborhood,
        data.publisherId,
        data.streetHint,
        data.streetLine,
      ]
        .filter((v) => typeof v === "string")
        .join(" ")
        .toLowerCase();
      return hay.includes(search);
    });
  }

  const publisherIds = docs.map((d) => String(d.data().publisherId ?? ""));
  const profiles = await enrichPublisherProfiles(db, publisherIds);
  const listings = docs.map((docSnap) => {
    const pid = String(docSnap.data().publisherId ?? "");
    return serializeListingRow(docSnap, profiles.get(pid));
  });

  return { listings };
}

async function adminGetListingHandler(request) {
  requireStaffRole(request, "moderator");
  const listingId = typeof request.data?.listingId === "string" ? request.data.listingId.trim() : "";
  if (!listingId) {
    throw new HttpsError("invalid-argument", "מזהה מודעה חסר.");
  }

  const db = getFirestore();
  const snap = await db.collection("listings").doc(listingId).get();
  if (!snap.exists) {
    throw new HttpsError("not-found", "המודעה לא נמצאה.");
  }

  const publisherId = String(snap.data().publisherId ?? "");
  const profiles = await enrichPublisherProfiles(db, [publisherId]);
  return { listing: serializeListingDetail(snap, profiles.get(publisherId)) };
}

function validateUpdatePayload(data) {
  const title = typeof data.title === "string" ? data.title.trim() : "";
  const description = typeof data.description === "string" ? data.description.trim() : "";
  const priceIls = Number(data.priceIls);
  const rooms = Number(data.rooms);
  const sizeSqm = Number(data.sizeSqm);
  const floor = Number(data.floor);
  const totalFloors = Number(data.totalFloors);
  const entryDate = typeof data.entryDate === "string" ? data.entryDate.trim() : "מיידי";
  const propertyTypeId = typeof data.propertyTypeId === "string" ? data.propertyTypeId.trim() : "";
  const propertyConditionId =
    typeof data.propertyConditionId === "string" ? data.propertyConditionId.trim() : "";

  if (!title || title.length > LISTING_TITLE_MAX) {
    throw new HttpsError("invalid-argument", "כותרת לא תקינה.");
  }
  if (!description || description.length > LISTING_DESCRIPTION_MAX) {
    throw new HttpsError("invalid-argument", `תיאור עד ${LISTING_DESCRIPTION_MAX} תווים.`);
  }
  if (!Number.isFinite(priceIls) || priceIls < 1) {
    throw new HttpsError("invalid-argument", "מחיר לא תקין.");
  }
  if (!Number.isFinite(rooms) || rooms < 0.5) {
    throw new HttpsError("invalid-argument", "מספר חדרים לא תקין.");
  }
  if (!Number.isFinite(sizeSqm) || sizeSqm < 1) {
    throw new HttpsError("invalid-argument", "גודל לא תקין.");
  }
  if (!Number.isFinite(floor) || !Number.isFinite(totalFloors)) {
    throw new HttpsError("invalid-argument", "קומה לא תקינה.");
  }

  return {
    title,
    description,
    priceIls: Math.round(priceIls),
    rooms,
    sizeSqm: Math.round(sizeSqm),
    floor: Math.round(floor),
    totalFloors: Math.round(totalFloors),
    entryDate: entryDate || "מיידי",
    propertyTypeId,
    propertyConditionId,
  };
}

async function adminUpdateListingHandler(request) {
  const { staffUid } = requireStaffRole(request, "admin");
  const listingId = typeof request.data?.listingId === "string" ? request.data.listingId.trim() : "";
  if (!listingId) {
    throw new HttpsError("invalid-argument", "מזהה מודעה חסר.");
  }

  const patch = validateUpdatePayload(request.data ?? {});
  const db = getFirestore();
  const ref = db.collection("listings").doc(listingId);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new HttpsError("not-found", "המודעה לא נמצאה.");
  }

  const now = FieldValue.serverTimestamp();
  await ref.set(
    {
      ...patch,
      updatedAt: now,
      adminEditedAt: now,
      adminEditedBy: staffUid,
    },
    { merge: true },
  );

  const publisherId = String(snap.data().publisherId ?? "");
  const profiles = await enrichPublisherProfiles(db, [publisherId]);
  const updated = await ref.get();
  return { ok: true, listing: serializeListingDetail(updated, profiles.get(publisherId)) };
}

async function adminModerateListingHandler(request) {
  const { staffUid } = requireStaffRole(request, "admin");
  const listingId = typeof request.data?.listingId === "string" ? request.data.listingId.trim() : "";
  const action = typeof request.data?.action === "string" ? request.data.action.trim() : "";
  const draftNote =
    typeof request.data?.draftNote === "string" ? request.data.draftNote.trim() : "";

  if (!listingId || !["approve", "return_to_draft", "remove"].includes(action)) {
    throw new HttpsError("invalid-argument", "בקשה לא תקינה.");
  }

  if (action === "approve") {
    return adminDecidePendingListingHandler({
      auth: request.auth,
      data: { listingId, decision: "approve" },
    });
  }

  const db = getFirestore();
  const listingRef = db.collection("listings").doc(listingId);
  const listingSnap = await listingRef.get();
  if (!listingSnap.exists) {
    throw new HttpsError("not-found", "המודעה לא נמצאה.");
  }

  const listing = listingSnap.data();
  const publisherId = String(listing.publisherId ?? "");
  const listingTitle = String(listing.title ?? "מודעה");
  const now = FieldValue.serverTimestamp();

  if (action === "remove") {
    await listingRef.set(
      {
        status: "removed",
        moderatedAt: now,
        moderatedBy: staffUid,
        moderationAction: "removed",
        moderationDraftNote: FieldValue.delete(),
        updatedAt: now,
      },
      { merge: true },
    );
    if (publisherId) {
      await createModerationNotification(db, {
        userId: publisherId,
        listingId,
        title: "המודעה הוסרה מהפלטפורמה",
        body: `המודעה «${listingTitle}» הוסרה על ידי צוות Lobby.`,
      });
    }
  } else {
    if (draftNote.length < 5) {
      throw new HttpsError("invalid-argument", "יש לכתוב הסבר למפרסם (לפחות 5 תווים).");
    }
    const publishRemainingMs = computePublishRemainingMs(listing);
    await listingRef.set(
      {
        status: "draft",
        publishRemainingMs,
        moderatedAt: now,
        moderatedBy: staffUid,
        moderationAction: "returned_to_draft",
        moderationDraftNote: draftNote.slice(0, ADMIN_MODERATION_DRAFT_NOTE_MAX),
        moderationResubmittedAt: FieldValue.delete(),
        updatedAt: now,
        expiryReminderSent: false,
      },
      { merge: true },
    );
    if (publisherId) {
      await createModerationNotification(db, {
        userId: publisherId,
        listingId,
        listingTarget: "publish",
        title: "נדרש עדכון למודעה",
        body: buildModerationUpdateNotificationBody(
          draftNote.slice(0, ADMIN_MODERATION_DRAFT_NOTE_MAX),
        ),
      });
    }
  }

  const profiles = await enrichPublisherProfiles(db, [publisherId]);
  const updated = await listingRef.get();
  return { ok: true, listing: serializeListingDetail(updated, profiles.get(publisherId)) };
}

module.exports = {
  adminListListingsHandler,
  adminGetListingHandler,
  adminUpdateListingHandler,
  adminModerateListingHandler,
};
