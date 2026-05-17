const { onDocumentCreated, onDocumentUpdated, onDocumentDeleted } = require("firebase-functions/v2/firestore");
const { onCall } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const {
  placesAutocompleteHandler,
  placesCitiesAutocompleteHandler,
  placesStreetsByCityHandler,
  placesStreetContextHandler,
  placesResolveHandler,
} = require("./places");
const {
  adminGetDashboardStatsHandler,
  adminListReportsHandler,
  adminUpdateReportStatusHandler,
  adminModerateListingFromReportHandler,
  adminResolveMyStaffRoleHandler,
} = require("./adminStaff");
const {
  adminSearchUsersHandler,
  adminBanUserHandler,
  adminUnbanUserHandler,
  adminSendPasswordResetHandler,
  adminDeleteUserHandler,
  adminListStaffHandler,
  adminSetStaffRoleHandler,
  adminRevokeStaffRoleHandler,
} = require("./adminUsers");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getStorage } = require("firebase-admin/storage");

initializeApp();

const MS_DAY = 24 * 60 * 60 * 1000;
const GRACE_DAYS = 14;
const REMIND_BEFORE_DAYS = 3;

async function sendExpoPushMessage(message) {
  const res = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Accept-Encoding": "gzip, deflate",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(message),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error("Expo push failed", res.status, text);
  }
}

async function createInAppNotification(db, params) {
  await db.collection("notifications").add({
    userId: params.userId,
    fromUserId: params.fromUserId || "lobby",
    kind: params.kind,
    title: params.title,
    body: params.body,
    read: false,
    listingId: params.listingId || "",
    threadId: params.threadId || "",
    createdAt: FieldValue.serverTimestamp(),
  });
}

async function deleteListingStorageFiles(publisherId, listingId) {
  if (!publisherId || !listingId) {
    return;
  }
  try {
    const bucket = getStorage().bucket();
    await bucket.deleteFiles({ prefix: `listing-media/${publisherId}/${listingId}/` });
  } catch (err) {
    console.error("listing storage cleanup failed", listingId, err?.message ?? err);
  }
}

function timestampToMillis(value) {
  if (!value) {
    return 0;
  }
  if (typeof value.toMillis === "function") {
    return value.toMillis();
  }
  if (typeof value.seconds === "number") {
    return value.seconds * 1000;
  }
  return 0;
}

exports.onNotificationCreated = onDocumentCreated(
  { document: "notifications/{notificationId}", region: "us-central1" },
  async (event) => {
  const data = event.data?.data();
  if (!data) {
    return;
  }

  const userId = typeof data.userId === "string" ? data.userId : "";
  if (!userId) {
    return;
  }

  const db = getFirestore();
  const userSnap = await db.collection("users").doc(userId).get();
  const profile = userSnap.data() || {};

  if (profile.pushNotificationsEnabled === false) {
    return;
  }

  const token = typeof profile.expoPushToken === "string" ? profile.expoPushToken : "";
  if (!token.startsWith("ExponentPushToken[")) {
    return;
  }

  const title = typeof data.title === "string" ? data.title : "לובי";
  const body = typeof data.body === "string" ? data.body : "";

  await sendExpoPushMessage({
    to: token,
    sound: "default",
    title,
    body,
    data: {
      kind: typeof data.kind === "string" ? data.kind : "system",
      threadId: typeof data.threadId === "string" ? data.threadId : "",
      listingId: typeof data.listingId === "string" ? data.listingId : "",
      notificationId: event.params.notificationId,
    },
  });
  },
);

exports.onListingCreated = onDocumentCreated(
  { document: "listings/{listingId}", region: "us-central1" },
  async (event) => {
    const data = event.data?.data();
    if (!data || data.status !== "active") {
      return;
    }
    const publisherId = typeof data.publisherId === "string" ? data.publisherId : "";
    if (!publisherId) {
      return;
    }
    const listingId = event.params.listingId;
    const title = typeof data.title === "string" ? data.title : "המודעה שלך";
    const db = getFirestore();
    await createInAppNotification(db, {
      userId: publisherId,
      fromUserId: "lobby",
      kind: "listing_published",
      title: "המודעה עלתה ללוח",
      body: `${title} פעילה בלובי.`,
      listingId,
    });
  },
);

exports.onListingUpdated = onDocumentUpdated(
  { document: "listings/{listingId}", region: "us-central1" },
  async (event) => {
  const before = event.data?.before?.data();
  const after = event.data?.after?.data();
  if (!before || !after) {
    return;
  }

  const listingId = event.params.listingId;
  const publisherId = typeof after.publisherId === "string" ? after.publisherId : "";
  const title = typeof after.title === "string" ? after.title : "המודעה שלך";

  if (before.status !== "active" && after.status === "active" && publisherId) {
    const db = getFirestore();
    await createInAppNotification(db, {
      userId: publisherId,
      fromUserId: "lobby",
      kind: "listing_published",
      title: "המודעה עלתה ללוח",
      body: `${title} פעילה בלובי.`,
      listingId,
    });
  }
  },
);

exports.onListingDeleted = onDocumentDeleted(
  { document: "listings/{listingId}", region: "us-central1" },
  async (event) => {
    const snap = event.data;
    if (!snap) {
      return;
    }
    const data = snap.data();
    const listingId = event.params.listingId;
    const publisherId =
      typeof data.publisherId === "string"
        ? data.publisherId
        : typeof data.publisher?.id === "string"
          ? data.publisher.id
          : "";
    await deleteListingStorageFiles(publisherId, listingId);
  },
);

exports.runListingLifecycle = onSchedule(
  { schedule: "every 6 hours", region: "us-central1" },
  async () => {
  const db = getFirestore();
  const now = Date.now();
  const remindThreshold = now + REMIND_BEFORE_DAYS * MS_DAY;

  const activeSnap = await db
    .collection("listings")
    .where("status", "in", ["active", "frozen"])
    .limit(500)
    .get();

  for (const docSnap of activeSnap.docs) {
    const data = docSnap.data();
    const listingId = docSnap.id;
    const publisherId = typeof data.publisherId === "string" ? data.publisherId : "";
    const title = typeof data.title === "string" ? data.title : "המודעה שלך";
    const expiresMs = timestampToMillis(data.expiresAt);

    if (!publisherId || expiresMs <= 0) {
      continue;
    }

    if (expiresMs <= now) {
      await docSnap.ref.update({
        status: "expired",
        expiredAt: FieldValue.serverTimestamp(),
      });
      await createInAppNotification(db, {
        userId: publisherId,
        fromUserId: "lobby",
        kind: "listing_expired",
        title: "המודעה ירדה מהלוח",
        body: `${title} — ניתן לחדש תוך ${GRACE_DAYS} יום באזור האישי.`,
        listingId,
      });
      continue;
    }

    if (expiresMs <= remindThreshold && data.expiryReminderSent !== true) {
      const daysLeft = Math.max(1, Math.ceil((expiresMs - now) / MS_DAY));
      await docSnap.ref.update({ expiryReminderSent: true });
      await createInAppNotification(db, {
        userId: publisherId,
        fromUserId: "lobby",
        kind: "listing_expiring",
        title: "המודעה תרד בקרוב",
        body: `${title} — עוד ${daysLeft} ימים בלוח. אפשר לחדש באזור האישי.`,
        listingId,
      });
    }
  }

  const graceCutoff = now - GRACE_DAYS * MS_DAY;
  const expiredSnap = await db.collection("listings").where("status", "==", "expired").limit(200).get();

  for (const docSnap of expiredSnap.docs) {
    const data = docSnap.data();
    const expiredAtMs = timestampToMillis(data.expiredAt);
    const graceStartMs = expiredAtMs > 0 ? expiredAtMs : timestampToMillis(data.expiresAt);
    if (graceStartMs > 0 && graceStartMs < graceCutoff) {
      const listingId = docSnap.id;
      const publisherId = typeof data.publisherId === "string" ? data.publisherId : "";
      await deleteListingStorageFiles(publisherId, listingId);
      await docSnap.ref.delete().catch((err) => {
        console.error("listing delete failed", listingId, err?.message ?? err);
      });
    }
  }
  },
);

const placesCallOptions = {
  region: "us-central1",
  cors: true,
};

exports.lobbyPlacesAutocomplete = onCall(placesCallOptions, async (request) => {
  return placesAutocompleteHandler(request.data);
});

exports.lobbyPlacesResolve = onCall(placesCallOptions, async (request) => {
  return placesResolveHandler(request.data);
});

exports.lobbyPlacesCitiesAutocomplete = onCall(placesCallOptions, async (request) => {
  return placesCitiesAutocompleteHandler(request.data);
});

exports.lobbyPlacesStreetsByCity = onCall(placesCallOptions, async (request) => {
  return placesStreetsByCityHandler(request.data);
});

exports.lobbyPlacesStreetContext = onCall(placesCallOptions, async (request) => {
  return placesStreetContextHandler(request.data);
});

exports.lobbyAdminResolveMyStaffRole = onCall(placesCallOptions, async (request) => {
  return adminResolveMyStaffRoleHandler(request);
});

exports.lobbyAdminGetDashboardStats = onCall(placesCallOptions, async (request) => {
  return adminGetDashboardStatsHandler(request);
});

exports.lobbyAdminListReports = onCall(placesCallOptions, async (request) => {
  return adminListReportsHandler(request);
});

exports.lobbyAdminUpdateReportStatus = onCall(placesCallOptions, async (request) => {
  return adminUpdateReportStatusHandler(request);
});

exports.lobbyAdminModerateListingFromReport = onCall(placesCallOptions, async (request) => {
  return adminModerateListingFromReportHandler(request);
});

exports.lobbyAdminSearchUsers = onCall(placesCallOptions, async (request) => {
  return adminSearchUsersHandler(request);
});

exports.lobbyAdminBanUser = onCall(placesCallOptions, async (request) => {
  return adminBanUserHandler(request);
});

exports.lobbyAdminUnbanUser = onCall(placesCallOptions, async (request) => {
  return adminUnbanUserHandler(request);
});

exports.lobbyAdminSendPasswordReset = onCall(placesCallOptions, async (request) => {
  return adminSendPasswordResetHandler(request);
});

exports.lobbyAdminDeleteUser = onCall(placesCallOptions, async (request) => {
  return adminDeleteUserHandler(request);
});

exports.lobbyAdminListStaff = onCall(placesCallOptions, async (request) => {
  return adminListStaffHandler(request);
});

exports.lobbyAdminSetStaffRole = onCall(placesCallOptions, async (request) => {
  return adminSetStaffRoleHandler(request);
});

exports.lobbyAdminRevokeStaffRole = onCall(placesCallOptions, async (request) => {
  return adminRevokeStaffRoleHandler(request);
});

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

exports.cleanupOldNotifications = onSchedule(
  { schedule: "every 24 hours", region: "us-central1" },
  async () => {
  const db = getFirestore();
  const cutoff = Date.now() - 365 * MS_DAY;
  const snap = await db.collection("notifications").orderBy("createdAt", "asc").limit(400).get();

  const batch = db.batch();
  let count = 0;
  for (const docSnap of snap.docs) {
    const ms = timestampToMillis(docSnap.data().createdAt);
    if (ms > 0 && ms < cutoff) {
      batch.delete(docSnap.ref);
      count += 1;
    }
  }
  if (count > 0) {
    await batch.commit();
  }
  },
);

exports.cleanupOldChatThreads = onSchedule(
  { schedule: "every 24 hours", region: "us-central1" },
  async () => {
    const db = getFirestore();
    const cutoffMs = Date.now() - 365 * MS_DAY;
    const snap = await db
      .collection("chatThreads")
      .orderBy("updatedAt", "asc")
      .limit(200)
      .get();

    let threadsDeleted = 0;
    let messagesDeleted = 0;

    for (const threadDoc of snap.docs) {
      const data = threadDoc.data();
      const activityMs = Math.max(
        timestampToMillis(data.updatedAt),
        timestampToMillis(data.lastMessageAt),
        timestampToMillis(data.createdAt),
      );
      if (activityMs <= 0 || activityMs >= cutoffMs) {
        continue;
      }
      messagesDeleted += await deleteChatMessagesBatch(threadDoc.ref);
      await threadDoc.ref.delete();
      threadsDeleted += 1;
    }

    if (threadsDeleted > 0) {
      console.log("cleanupOldChatThreads", { threadsDeleted, messagesDeleted });
    }
  },
);
