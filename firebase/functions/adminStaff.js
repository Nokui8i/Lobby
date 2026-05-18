const { HttpsError } = require("firebase-functions/v2/https");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

const { computePublishRemainingMs } = require("./listingPublishTime");
const { buildModerationUpdateNotificationBody } = require("./notificationCopy");

const ADMIN_MODERATION_DRAFT_NOTE_MAX = 500;
const REPORT_REASON_LABELS = {
  broker_fee_requested: "דרשו ממני דמי תיווך",
  broker_or_agent: "זה מתווך או משרד תיווך",
  fake_listing: "מודעה מזויפת",
  wrong_details: "פרטים לא נכונים",
  scam: "חשד להונאה",
  offensive_content: "תוכן פוגעני",
  other: "משהו אחר",
};

const ROLE_RANK = {
  moderator: 1,
  admin: 2,
  owner: 3,
};

function platformOwnerUids() {
  const raw = process.env.LOBBY_ADMIN_UIDS ?? "";
  return new Set(raw.split(",").map((s) => s.trim()).filter(Boolean));
}

/** בעלי פלטפורמה (LOBBY_ADMIN_UIDS) תמיד owner — גם אם יש claim שגוי של עובד/מנהל. */
function staffRoleFromAuth(auth) {
  if (!auth?.uid) {
    return null;
  }
  if (platformOwnerUids().has(auth.uid)) {
    return "owner";
  }
  const role = auth.token?.staffRole;
  if (role === "moderator" || role === "admin" || role === "owner") {
    return role;
  }
  return null;
}

async function adminResolveMyStaffRoleHandler(request) {
  if (!request.auth?.uid) {
    throw new HttpsError("permission-denied", "לא מחובר.");
  }
  const uid = request.auth.uid;
  let role = staffRoleFromAuth(request.auth);
  if (!role) {
    throw new HttpsError("permission-denied", "אין הרשאת צוות.");
  }

  const db = getFirestore();
  const userRef = db.collection("users").doc(uid);
  const userSnap = await userRef.get();
  const profileRole =
    userSnap.exists && typeof userSnap.data()?.staffRole === "string"
      ? userSnap.data().staffRole
      : "";
  if (
    (profileRole === "moderator" || profileRole === "admin" || profileRole === "owner") &&
    ROLE_RANK[profileRole] > ROLE_RANK[role]
  ) {
    role = profileRole;
  }

  await userRef.set(
    {
      staffRole: role,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  const auth = getAuth();
  const authUser = await auth.getUser(uid);
  const claims = { ...(authUser.customClaims ?? {}) };
  if (claims.staffRole !== role) {
    claims.staffRole = role;
    await auth.setCustomUserClaims(uid, claims);
  }

  return { role, claimsUpdated: claims.staffRole === role };
}

function isStaffAuth(auth) {
  return staffRoleFromAuth(auth) !== null;
}

function requireStaff(request) {
  if (!isStaffAuth(request.auth)) {
    throw new HttpsError("permission-denied", "אין הרשאת צוות.");
  }
  return request.auth.uid;
}

function requireStaffRole(request, minimum) {
  const role = staffRoleFromAuth(request.auth);
  if (!role || ROLE_RANK[role] < ROLE_RANK[minimum]) {
    throw new HttpsError("permission-denied", "אין הרשאה לפעולה זו.");
  }
  return { staffUid: request.auth.uid, role };
}

function normalizeReportStatus(raw) {
  if (raw === "in_progress" || raw === "resolved") {
    return raw;
  }
  return "open";
}

function reportNeedsTreatment(status) {
  return status === "open" || status === "in_progress";
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

function serializeReportDoc(id, data, enrich = {}) {
  const reason = typeof data.reason === "string" ? data.reason : "other";
  const status = normalizeReportStatus(data.status);
  return {
    id,
    listingId: String(data.listingId ?? ""),
    listingTitle: String(data.listingTitle ?? ""),
    reporterId: String(data.reporterId ?? ""),
    reporterEmail: enrich.reporterEmail ?? "",
    reporterDisplayName: enrich.reporterDisplayName ?? "",
    publisherId: enrich.publisherId ?? "",
    publisherEmail: enrich.publisherEmail ?? "",
    publisherDisplayName: enrich.publisherDisplayName ?? "",
    listingStatus: enrich.listingStatus ?? "",
    reason,
    reasonLabel: REPORT_REASON_LABELS[reason] ?? reason,
    otherDetails: typeof data.otherDetails === "string" ? data.otherDetails : undefined,
    status,
    createdAt: timestampToIso(data.createdAt),
  };
}

async function loadAuthProfiles(uidList) {
  const profiles = new Map();
  const unique = [...new Set(uidList.filter(Boolean))];
  for (let i = 0; i < unique.length; i += 100) {
    const chunk = unique.slice(i, i + 100);
    const result = await getAuth().getUsers(chunk.map((uid) => ({ uid })));
    for (const user of result.users) {
      profiles.set(user.uid, {
        email: user.email ?? "",
        displayName: user.displayName ?? "",
      });
    }
  }
  return profiles;
}

async function enrichReportsForAdmin(reports, db) {
  if (reports.length === 0) {
    return [];
  }

  const listingIds = [...new Set(reports.map((r) => r.listingId).filter(Boolean))];
  const listingSnaps = await Promise.all(
    listingIds.map((id) => db.collection("listings").doc(id).get()),
  );
  const listingById = new Map();
  const userIds = new Set();

  for (const snap of listingSnaps) {
    if (!snap.exists) {
      continue;
    }
    const data = snap.data();
    const publisherId = String(data.publisherId ?? "");
    listingById.set(snap.id, {
      publisherId,
      listingStatus: typeof data.status === "string" ? data.status : "",
    });
    if (publisherId) {
      userIds.add(publisherId);
    }
  }

  for (const report of reports) {
    if (report.reporterId) {
      userIds.add(report.reporterId);
    }
  }

  const profiles = await loadAuthProfiles([...userIds]);

  return reports.map((report) => {
    const listing = listingById.get(report.listingId);
    const publisherId = listing?.publisherId ?? "";
    const publisherProfile = publisherId ? profiles.get(publisherId) : null;
    const reporterProfile = report.reporterId ? profiles.get(report.reporterId) : null;
    return {
      ...report,
      publisherId,
      listingStatus: listing?.listingStatus ?? "",
      publisherEmail: publisherProfile?.email ?? "",
      publisherDisplayName: publisherProfile?.displayName ?? "",
      reporterEmail: reporterProfile?.email ?? "",
      reporterDisplayName: reporterProfile?.displayName ?? "",
    };
  });
}

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

async function countActiveListings(db) {
  const snap = await db.collection("listings").where("status", "==", "active").count().get();
  return snap.data().count;
}

async function countReportStats(db) {
  const snap = await db.collection("listingReports").orderBy("createdAt", "desc").limit(500).get();
  let openReports = 0;
  let needsTreatmentReports = 0;
  for (const docSnap of snap.docs) {
    const status = normalizeReportStatus(docSnap.data().status);
    if (status !== "resolved") {
      openReports += 1;
    }
    if (reportNeedsTreatment(status)) {
      needsTreatmentReports += 1;
    }
  }
  return { openReports, needsTreatmentReports };
}

async function adminGetDashboardStatsHandler(request) {
  requireStaff(request);
  const db = getFirestore();
  const { countOpenInquiries } = require("./supportInquiries");
  const [{ openReports, needsTreatmentReports }, activeListings, openInquiries] = await Promise.all([
    countReportStats(db),
    countActiveListings(db),
    countOpenInquiries(db),
  ]);
  return {
    openReports,
    needsTreatmentReports,
    activeListings,
    openInquiries,
  };
}

async function adminListReportsHandler(request) {
  requireStaff(request);
  const db = getFirestore();
  const snap = await db.collection("listingReports").orderBy("createdAt", "desc").limit(500).get();
  const base = snap.docs.map((docSnap) => serializeReportDoc(docSnap.id, docSnap.data()));
  const reports = await enrichReportsForAdmin(base, db);
  return { reports };
}

async function adminUpdateReportStatusHandler(request) {
  const staffUid = requireStaff(request);
  const reportId = typeof request.data?.reportId === "string" ? request.data.reportId.trim() : "";
  const status = typeof request.data?.status === "string" ? request.data.status.trim() : "";
  if (!reportId || !["open", "in_progress", "resolved"].includes(status)) {
    throw new HttpsError("invalid-argument", "בקשה לא תקינה.");
  }
  const db = getFirestore();
  const ref = db.collection("listingReports").doc(reportId);
  const existing = await ref.get();
  if (!existing.exists) {
    throw new HttpsError("not-found", "דיווח לא נמצא.");
  }
  await ref.update({
    status,
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: staffUid,
  });
  return { ok: true, report: serializeReportDoc(reportId, { ...existing.data(), status }) };
}

async function adminModerateListingFromReportHandler(request) {
  const staffUid = requireStaff(request);
  const reportId = typeof request.data?.reportId === "string" ? request.data.reportId.trim() : "";
  const action =
    typeof request.data?.action === "string" ? request.data.action.trim() : "";
  const draftNote =
    typeof request.data?.draftNote === "string" ? request.data.draftNote.trim() : "";

  if (!reportId || !["remove", "return_to_draft"].includes(action)) {
    throw new HttpsError("invalid-argument", "בקשה לא תקינה.");
  }

  if (action === "return_to_draft") {
    if (draftNote.length < 5) {
      throw new HttpsError("invalid-argument", "יש לכתוב הסבר למפרסם (לפחות 5 תווים).");
    }
    if (draftNote.length > ADMIN_MODERATION_DRAFT_NOTE_MAX) {
      throw new HttpsError(
        "invalid-argument",
        `ההסבר ארוך מדי (עד ${ADMIN_MODERATION_DRAFT_NOTE_MAX} תווים).`,
      );
    }
  }

  const db = getFirestore();
  const reportRef = db.collection("listingReports").doc(reportId);
  const reportSnap = await reportRef.get();
  if (!reportSnap.exists) {
    throw new HttpsError("not-found", "דיווח לא נמצא.");
  }

  const reportData = reportSnap.data();
  const listingId = String(reportData.listingId ?? "").trim();
  if (!listingId) {
    throw new HttpsError("failed-precondition", "לדיווח אין מודעה מקושרת.");
  }

  const listingRef = db.collection("listings").doc(listingId);
  const listingSnap = await listingRef.get();
  if (!listingSnap.exists) {
    throw new HttpsError("not-found", "המודעה לא נמצאה.");
  }

  const listing = listingSnap.data();
  const publisherId = String(listing.publisherId ?? "");
  const listingTitle = String(listing.title ?? reportData.listingTitle ?? "מודעה");
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
        body: `המודעה «${listingTitle}» הוסרה בעקבות דיווח. לשאלות — צרו קשר עם התמיכה.`,
      });
    }
  } else {
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

  await reportRef.set(
    {
      status: "resolved",
      updatedAt: now,
      updatedBy: staffUid,
      resolutionAction: action,
    },
    { merge: true },
  );

  const updatedReport = serializeReportDoc(reportId, {
    ...reportData,
    status: "resolved",
    resolutionAction: action,
  });
  const [enriched] = await enrichReportsForAdmin([updatedReport], db);
  return { ok: true, report: enriched };
}

module.exports = {
  isStaffAuth,
  staffRoleFromAuth,
  platformOwnerUids,
  requireStaff,
  requireStaffRole,
  adminGetDashboardStatsHandler,
  adminListReportsHandler,
  adminUpdateReportStatusHandler,
  adminModerateListingFromReportHandler,
  adminResolveMyStaffRoleHandler,
};
