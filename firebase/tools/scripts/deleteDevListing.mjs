/**
 * מוחק מודעת פיתוח/בדיקות מ־Firestore (לא מוחק קבצי Storage — אפשר לנקות ידנית ב־Console אם צריך).
 *
 * דרישות: כמו seed — firebase-admin + GOOGLE_APPLICATION_CREDENTIALS או ADC.
 *
 * הרצה:
 *   node scripts/deleteDevListing.mjs
 *   node scripts/deleteDevListing.mjs dev-seed-iaaoa-primary
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import admin from "firebase-admin";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_LISTING_ID = "dev-seed-iaaoa-primary";

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

const projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || loadOptionalProjectId();

if (!admin.apps.length) {
  admin.initializeApp(projectId ? { projectId } : undefined);
}

const listingId = (process.argv[2] || DEFAULT_LISTING_ID).trim();

async function main() {
  const ref = admin.firestore().collection("listings").doc(listingId);
  const snap = await ref.get();
  if (!snap.exists) {
    console.log("אין מסמך — כבר נמחק או מזהה שגוי:", listingId);
    return;
  }
  await ref.delete();
  console.log("נמחק:", listingId);
}

main().catch((err) => {
  console.error(err?.message || err);
  process.exit(1);
});
