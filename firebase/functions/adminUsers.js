const { HttpsError } = require("firebase-functions/v2/https");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { requireStaffRole } = require("./adminStaff");

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

function providerLabels(userRecord) {
  const labels = [];
  for (const entry of userRecord.providerData ?? []) {
    if (entry.providerId) {
      labels.push(entry.providerId);
    }
  }
  return labels;
}

function readStaffRoleFromClaims(claims) {
  const role = claims?.staffRole;
  if (role === "moderator" || role === "admin" || role === "owner") {
    return role;
  }
  if (claims?.admin === true) {
    return "owner";
  }
  return null;
}

async function authUserStaffRole(uid) {
  try {
    const record = await getAuth().getUser(uid);
    return readStaffRoleFromClaims(record.customClaims);
  } catch {
    return null;
  }
}

async function authUserIsStaff(uid) {
  return (await authUserStaffRole(uid)) !== null;
}

const { platformOwnerUids } = require("./adminStaff");

function resolveStaffRoleForUid(uid, authRecord) {
  const fromClaims = authRecord ? readStaffRoleFromClaims(authRecord.customClaims) : null;
  if (fromClaims) {
    return fromClaims;
  }
  if (platformOwnerUids().has(uid)) {
    return "owner";
  }
  return null;
}

function isProtectedPlatformOwner(uid, staffRole) {
  return staffRole === "owner" || platformOwnerUids().has(uid);
}

function filterUsersForViewer(users, viewerRole) {
  if (viewerRole === "owner") {
    return users;
  }
  return users.filter((user) => !isProtectedPlatformOwner(user.id, user.staffRole));
}

async function assertTargetAllowsStaffMutation(uid) {
  const authRecord = await getAuth()
    .getUser(uid)
    .catch(() => null);
  const role = resolveStaffRoleForUid(uid, authRecord);
  if (isProtectedPlatformOwner(uid, role)) {
    throw new HttpsError("permission-denied", "לא ניתן לבצע פעולה על חשבון בעלים.");
  }
}

function serializeAdminUser(uid, firestoreData, authRecord) {
  const data = firestoreData ?? {};
  const staffRole = resolveStaffRoleForUid(uid, authRecord);
  const banned = data.banned === true || authRecord?.customClaims?.banned === true;
  return {
    id: uid,
    email: authRecord?.email ?? (typeof data.email === "string" ? data.email : null),
    displayName:
      (typeof data.displayName === "string" && data.displayName.trim()) ||
      authRecord?.displayName?.trim() ||
      "משתמש",
    banned,
    banReason: typeof data.banReason === "string" ? data.banReason : undefined,
    bannedAt: timestampToIso(data.bannedAt),
    createdAt: timestampToIso(data.createdAt) || timestampToIso(authRecord?.metadata?.creationTime),
    updatedAt: timestampToIso(data.updatedAt),
    providers: authRecord ? providerLabels(authRecord) : [],
    staffRole,
    isStaff: staffRole !== null,
  };
}

async function loadAdminUser(db, uid) {
  const [docSnap, authRecord] = await Promise.all([
    db.collection("users").doc(uid).get(),
    getAuth()
      .getUser(uid)
      .catch(() => null),
  ]);
  if (!authRecord && !docSnap.exists) {
    return null;
  }
  return serializeAdminUser(uid, docSnap.exists ? docSnap.data() : {}, authRecord);
}

async function sendPasswordResetEmail(email) {
  const apiKey = process.env.LOBBY_FIREBASE_WEB_API_KEY?.trim();
  if (!apiKey) {
    return { sent: false, reason: "missing_api_key" };
  }
  const continueUrl =
    process.env.LOBBY_PUBLIC_SITE_URL?.trim() || "https://lobby-rental-platform.web.app";
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requestType: "PASSWORD_RESET",
        email,
        continueUrl,
      }),
    },
  );
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error("password reset email failed", res.status, text);
    return { sent: false, reason: "send_failed" };
  }
  return { sent: true };
}

async function adminSearchUsersHandler(request) {
  const { role: viewerRole } = requireStaffRole(request, "moderator");
  const db = getFirestore();
  const rawQuery = typeof request.data?.query === "string" ? request.data.query.trim().toLowerCase() : "";
  const limit = Math.min(Math.max(Number(request.data?.limit) || 40, 1), 80);

  const emailQuery = typeof request.data?.query === "string" ? request.data.query.trim() : "";
  if (emailQuery.includes("@") && emailQuery.length >= 5) {
    try {
      const authRecord = await getAuth().getUserByEmail(emailQuery);
      const user = await loadAdminUser(db, authRecord.uid);
      return { users: filterUsersForViewer(user ? [user] : [], viewerRole) };
    } catch {
      return { users: [] };
    }
  }

  if (rawQuery.length >= 28 && /^[a-z0-9]+$/i.test(rawQuery)) {
    const user = await loadAdminUser(db, rawQuery);
    return { users: filterUsersForViewer(user ? [user] : [], viewerRole) };
  }

  const snap = await db.collection("users").orderBy("updatedAt", "desc").limit(120).get();
  const users = [];
  for (const docSnap of snap.docs) {
    const data = docSnap.data();
    const email = typeof data.email === "string" ? data.email.toLowerCase() : "";
    const name = typeof data.displayName === "string" ? data.displayName.toLowerCase() : "";
    const id = docSnap.id.toLowerCase();
    if (rawQuery && !email.includes(rawQuery) && !name.includes(rawQuery) && !id.includes(rawQuery)) {
      continue;
    }
    const authRecord = await getAuth()
      .getUser(docSnap.id)
      .catch(() => null);
    users.push(serializeAdminUser(docSnap.id, data, authRecord));
    if (users.length >= limit) {
      break;
    }
  }
  return { users: filterUsersForViewer(users, viewerRole) };
}

async function adminBanUserHandler(request) {
  const { staffUid } = requireStaffRole(request, "moderator");
  const uid = typeof request.data?.userId === "string" ? request.data.userId.trim() : "";
  const reason = typeof request.data?.reason === "string" ? request.data.reason.trim().slice(0, 200) : "";
  if (!uid) {
    throw new HttpsError("invalid-argument", "מזהה משתמש חסר.");
  }
  if (uid === staffUid) {
    throw new HttpsError("failed-precondition", "לא ניתן לחסום את עצמך.");
  }
  await assertTargetAllowsStaffMutation(uid);

  const auth = getAuth();
  const existing = await auth.getUser(uid).catch(() => null);
  if (!existing) {
    throw new HttpsError("not-found", "משתמש לא נמצא.");
  }

  const claims = { ...(existing.customClaims ?? {}), banned: true };
  await auth.setCustomUserClaims(uid, claims);
  await auth.revokeRefreshTokens(uid);

  const db = getFirestore();
  await db.collection("users").doc(uid).set(
    {
      banned: true,
      banReason: reason || null,
      bannedAt: FieldValue.serverTimestamp(),
      bannedBy: staffUid,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  const user = await loadAdminUser(db, uid);
  return { ok: true, user };
}

async function adminUnbanUserHandler(request) {
  requireStaffRole(request, "moderator");
  const uid = typeof request.data?.userId === "string" ? request.data.userId.trim() : "";
  if (!uid) {
    throw new HttpsError("invalid-argument", "מזהה משתמש חסר.");
  }
  await assertTargetAllowsStaffMutation(uid);

  const auth = getAuth();
  const existing = await auth.getUser(uid).catch(() => null);
  if (!existing) {
    throw new HttpsError("not-found", "משתמש לא נמצא.");
  }

  const claims = { ...(existing.customClaims ?? {}) };
  delete claims.banned;
  await auth.setCustomUserClaims(uid, claims);

  const db = getFirestore();
  await db.collection("users").doc(uid).set(
    {
      banned: false,
      banReason: null,
      bannedAt: null,
      bannedBy: null,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  const user = await loadAdminUser(db, uid);
  return { ok: true, user };
}

async function adminSendPasswordResetHandler(request) {
  requireStaffRole(request, "moderator");
  const uid = typeof request.data?.userId === "string" ? request.data.userId.trim() : "";
  if (!uid) {
    throw new HttpsError("invalid-argument", "מזהה משתמש חסר.");
  }
  await assertTargetAllowsStaffMutation(uid);

  const authRecord = await getAuth()
    .getUser(uid)
    .catch(() => null);
  if (!authRecord?.email) {
    throw new HttpsError("failed-precondition", "למשתמש אין אימייל לשחזור סיסמה.");
  }

  const hasPassword = (authRecord.providerData ?? []).some((p) => p.providerId === "password");
  if (!hasPassword) {
    throw new HttpsError(
      "failed-precondition",
      "המשתמש נרשם עם Google — אין סיסמה לאיפוס. בקשו ממנו להתחבר עם Google.",
    );
  }

  const sendResult = await sendPasswordResetEmail(authRecord.email);
  if (!sendResult.sent) {
    const link = await getAuth().generatePasswordResetLink(authRecord.email);
    return {
      ok: true,
      emailSent: false,
      message: "לא נשלח מייל אוטומטי. העתיקו את הקישור ללקוח בערוץ מאובטח.",
      resetLink: link,
    };
  }

  return {
    ok: true,
    emailSent: true,
    message: `נשלח מייל לאיפוס סיסמה ל־${authRecord.email}`,
  };
}

async function deleteUserSubcollections(db, uid) {
  const savedRef = db.collection("users").doc(uid).collection("savedListings");
  const savedSnap = await savedRef.limit(200).get();
  if (savedSnap.empty) {
    return;
  }
  const batch = db.batch();
  for (const docSnap of savedSnap.docs) {
    batch.delete(docSnap.ref);
  }
  await batch.commit();
  if (savedSnap.size >= 200) {
    await deleteUserSubcollections(db, uid);
  }
}

async function adminDeleteUserHandler(request) {
  const { staffUid } = requireStaffRole(request, "owner");
  const uid = typeof request.data?.userId === "string" ? request.data.userId.trim() : "";
  if (!uid) {
    throw new HttpsError("invalid-argument", "מזהה משתמש חסר.");
  }
  if (uid === staffUid) {
    throw new HttpsError("failed-precondition", "לא ניתן למחוק את עצמך.");
  }
  await assertTargetAllowsStaffMutation(uid);
  if (await authUserIsStaff(uid)) {
    throw new HttpsError("failed-precondition", "לא ניתן למחוק משתמש צוות.");
  }

  const db = getFirestore();
  await deleteUserSubcollections(db, uid);

  const listingsSnap = await db.collection("listings").where("publisherId", "==", uid).limit(100).get();
  for (const docSnap of listingsSnap.docs) {
    await docSnap.ref.update({
      status: "removed",
      updatedAt: FieldValue.serverTimestamp(),
      removedByAdmin: true,
    });
  }

  await db.collection("users").doc(uid).delete().catch(() => undefined);
  await getAuth()
    .deleteUser(uid)
    .catch((err) => {
      if (err?.code === "auth/user-not-found") {
        return;
      }
      throw err;
    });

  return { ok: true };
}

async function adminListStaffHandler(request) {
  requireStaffRole(request, "owner");
  const db = getFirestore();
  const auth = getAuth();
  const snap = await db.collection("users").orderBy("updatedAt", "desc").limit(200).get();
  const staff = [];
  for (const docSnap of snap.docs) {
    const authRecord = await auth.getUser(docSnap.id).catch(() => null);
    const role = resolveStaffRoleForUid(docSnap.id, authRecord);
    if (!role) {
      continue;
    }
    staff.push(serializeAdminUser(docSnap.id, docSnap.data(), authRecord));
  }
  staff.sort((a, b) => {
    const rank = { owner: 3, admin: 2, moderator: 1 };
    return (rank[b.staffRole ?? "moderator"] ?? 0) - (rank[a.staffRole ?? "moderator"] ?? 0);
  });
  return { staff };
}

async function adminSetStaffRoleHandler(request) {
  const { staffUid } = requireStaffRole(request, "owner");
  const uid = typeof request.data?.userId === "string" ? request.data.userId.trim() : "";
  const role = typeof request.data?.role === "string" ? request.data.role.trim() : "";
  if (!uid) {
    throw new HttpsError("invalid-argument", "מזהה משתמש חסר.");
  }
  if (uid === staffUid) {
    throw new HttpsError("failed-precondition", "לא ניתן לשנות את התפקיד של עצמך.");
  }
  if (role !== "moderator" && role !== "admin") {
    throw new HttpsError("invalid-argument", "תפקיד לא חוקי. רק עובד או מנהל.");
  }

  const auth = getAuth();
  const existing = await auth.getUser(uid).catch(() => null);
  if (!existing) {
    throw new HttpsError("not-found", "משתמש לא נמצא.");
  }

  const currentRole = resolveStaffRoleForUid(uid, existing);
  if (isProtectedPlatformOwner(uid, currentRole)) {
    throw new HttpsError("failed-precondition", "לא ניתן לשנות תפקיד בעלים.");
  }

  const claims = { ...(existing.customClaims ?? {}) };
  delete claims.banned;
  claims.staffRole = role;
  await auth.setCustomUserClaims(uid, claims);

  const db = getFirestore();
  await db.collection("users").doc(uid).set(
    {
      banned: false,
      banReason: null,
      bannedAt: null,
      bannedBy: null,
      staffRole: role,
      staffAssignedAt: FieldValue.serverTimestamp(),
      staffAssignedBy: staffUid,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  const user = await loadAdminUser(db, uid);
  return { ok: true, user };
}

async function adminRevokeStaffRoleHandler(request) {
  const { staffUid } = requireStaffRole(request, "owner");
  const uid = typeof request.data?.userId === "string" ? request.data.userId.trim() : "";
  if (!uid) {
    throw new HttpsError("invalid-argument", "מזהה משתמש חסר.");
  }
  if (uid === staffUid) {
    throw new HttpsError("failed-precondition", "לא ניתן להסיר את עצמך מהצוות.");
  }

  const auth = getAuth();
  const existing = await auth.getUser(uid).catch(() => null);
  if (!existing) {
    throw new HttpsError("not-found", "משתמש לא נמצא.");
  }

  const currentRole = resolveStaffRoleForUid(uid, existing);
  if (isProtectedPlatformOwner(uid, currentRole)) {
    throw new HttpsError("failed-precondition", "לא ניתן להסיר בעלים מהצוות.");
  }
  if (!currentRole) {
    throw new HttpsError("failed-precondition", "המשתמש אינו בצוות.");
  }

  const claims = { ...(existing.customClaims ?? {}) };
  delete claims.staffRole;
  await auth.setCustomUserClaims(uid, claims);
  await auth.revokeRefreshTokens(uid);

  const db = getFirestore();
  await db.collection("users").doc(uid).set(
    {
      staffRole: null,
      staffAssignedAt: null,
      staffAssignedBy: null,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  const user = await loadAdminUser(db, uid);
  return { ok: true, user };
}

module.exports = {
  adminSearchUsersHandler,
  adminBanUserHandler,
  adminUnbanUserHandler,
  adminSendPasswordResetHandler,
  adminDeleteUserHandler,
  adminListStaffHandler,
  adminSetStaffRoleHandler,
  adminRevokeStaffRoleHandler,
};
