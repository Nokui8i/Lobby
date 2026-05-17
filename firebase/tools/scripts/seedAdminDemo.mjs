/**
 * דמו לאדמין: דיווח מודעה פתוח.
 *
 *   npm run seed:admin-demo
 *   npm run seed:admin-demo -- --clean
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import admin from "firebase-admin";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ID = process.env.FIREBASE_PROJECT_ID ?? "lobby-rental-platform";
const DEFAULT_LISTING_ID = "dev-seed-iaaoa-primary";
const DEFAULT_LISTING_TITLE = "דירת בדיקות — Lobby (פיתוח)";
const DEMO_REPORT_ID = "dev-admin-demo-report";
const DEMO_REPORTER_EMAIL = "iaaoamar12@gmail.com";

function loadOptionalProjectId() {
  const envPath = join(__dirname, "../../../apps/web/.env.local");
  try {
    const raw = readFileSync(envPath, "utf8");
    const line = raw.split("\n").find((l) => l.startsWith("NEXT_PUBLIC_FIREBASE_PROJECT_ID="));
    if (!line) return undefined;
    const v = line.split("=")[1]?.trim();
    return v && !v.startsWith("#") ? v : undefined;
  } catch {
    return undefined;
  }
}

function initAdmin() {
  if (admin.apps.length) {
    return;
  }
  const localKey = join(__dirname, "..", "serviceAccountKey.json");
  const projectId =
    process.env.GOOGLE_CLOUD_PROJECT ||
    process.env.GCLOUD_PROJECT ||
    loadOptionalProjectId() ||
    PROJECT_ID;

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS || existsSync(localKey)) {
    const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS ?? localKey;
    const serviceAccount = JSON.parse(readFileSync(keyPath, "utf8"));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id ?? projectId,
    });
    return;
  }
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId,
  });
}

const clean = process.argv.includes("--clean");
const listingId = process.argv.find((a) => a.startsWith("--listing="))?.split("=")[1]?.trim() || DEFAULT_LISTING_ID;

async function resolveReporterId() {
  try {
    const user = await admin.auth().getUserByEmail(DEMO_REPORTER_EMAIL);
    return user.uid;
  } catch {
    return "dev-demo-reporter";
  }
}

async function seedReport(db, now, reporterId, listingTitle) {
  const ref = db.collection("listingReports").doc(DEMO_REPORT_ID);
  await ref.set(
    {
      listingId,
      listingTitle,
      reporterId,
      reason: "broker_or_agent",
      status: "open",
      createdAt: now,
    },
    { merge: true },
  );
}

const LEGACY_DEMO_NEIGHBORHOOD_ID = "il-city-5000_שכונת דמו לובי";

async function cleanDemo(db) {
  await db.collection("listingReports").doc(DEMO_REPORT_ID).delete();
  await db.collection("neighborhoodCandidates").doc(LEGACY_DEMO_NEIGHBORHOOD_ID).delete().catch(() => {});
}

async function main() {
  initAdmin();
  const db = admin.firestore();

  if (clean) {
    await cleanDemo(db);
    console.log("OK — demo report removed");
    return;
  }

  const listingSnap = await db.collection("listings").doc(listingId).get();
  const listingTitle = listingSnap.exists
    ? String(listingSnap.data()?.title ?? DEFAULT_LISTING_TITLE)
    : DEFAULT_LISTING_TITLE;

  if (!listingSnap.exists) {
    console.warn(
      `Warning: listing "${listingId}" not found. Run: npm run firebase:seed-dev-listing`,
    );
  }

  const now = admin.firestore.Timestamp.now();
  const reporterId = await resolveReporterId();
  await seedReport(db, now, reporterId, listingTitle);

  console.log("OK — admin demo report ready");
  console.log("  reportId:", DEMO_REPORT_ID);
  console.log("  listingId:", listingId);
  console.log("  Admin: http://localhost:3001/reports");
}

main().catch((err) => {
  console.error(err?.message || err);
  process.exit(1);
});
