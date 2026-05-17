/**
 * בדיקת חיבור lifecycle + notifications בפרויקט Firebase.
 * הרצה מתוך firebase/functions:
 *   node scripts/verify-lifecycle-notifications.js
 *
 * דורש: GOOGLE_APPLICATION_CREDENTIALS או firebase login + ADC
 */
const { initializeApp, applicationDefault } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

const PROJECT_ID = "lobby-rental-platform";

initializeApp({
  credential: applicationDefault(),
  projectId: PROJECT_ID,
});

const db = getFirestore();

async function main() {
  console.log("Project:", PROJECT_ID);

  const activeSnap = await db.collection("listings").where("status", "==", "active").limit(5).get();
  console.log("\nActive listings (sample):", activeSnap.size);
  for (const doc of activeSnap.docs) {
    const d = doc.data();
    const expires = d.expiresAt?.toDate?.() ?? null;
    console.log(" -", doc.id, "| expiresAt:", expires?.toISOString() ?? "missing", "| reminder:", d.expiryReminderSent === true);
  }

  const expiredSnap = await db.collection("listings").where("status", "==", "expired").limit(5).get();
  console.log("\nExpired listings (sample):", expiredSnap.size);
  for (const doc of expiredSnap.docs) {
    const d = doc.data();
    console.log(
      " -",
      doc.id,
      "| expiredAt:",
      d.expiredAt?.toDate?.()?.toISOString() ?? "missing",
      "| expiresAt:",
      d.expiresAt?.toDate?.()?.toISOString() ?? "missing",
    );
  }

  const notifSnap = await db
    .collection("notifications")
    .orderBy("createdAt", "desc")
    .limit(10)
    .get();
  console.log("\nLatest notifications (all users):", notifSnap.size);
  for (const doc of notifSnap.docs) {
    const d = doc.data();
    console.log(
      " -",
      d.kind,
      "|",
      d.title,
      "| user:",
      d.userId?.slice(0, 8),
      "| listing:",
      (d.listingId || "").slice(0, 8),
    );
  }

  const lifecycleKinds = ["listing_expiring", "listing_expired", "listing_published"];
  for (const kind of lifecycleKinds) {
    const snap = await db.collection("notifications").where("kind", "==", kind).limit(3).get();
    console.log(`\nNotifications kind=${kind}:`, snap.size, "recent");
  }

  console.log("\nDone. Scheduler runListingLifecycle runs every 6 hours on Firebase.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
