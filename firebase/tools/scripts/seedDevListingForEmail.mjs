/**
 * יוצר או מעדכן מודעת Firestore פעילה עבור משתמש Auth לפי מייל (פיתוח / בדיקות).
 *
 * דרישות:
 * - npm install בתיקיית firebase/tools
 * - הרשאות Admin: קובץ שירות (מומלץ) או Application Default Credentials
 *   GOOGLE_APPLICATION_CREDENTIALS=נתיב/ל/serviceAccount.json
 *
 * הרצה:
 *   node scripts/seedDevListingForEmail.mjs
 *   node scripts/seedDevListingForEmail.mjs other@email.com
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import admin from "firebase-admin";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_EMAIL = "iaaoamar15@gmail.com";
const DEFAULT_LISTING_ID = "dev-seed-iaaoa-primary";

const SAMPLE_IMAGE =
  "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80";
const SAMPLE_IMAGE_2 =
  "https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=1200&q=80";

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

const email = (process.argv[2] || DEFAULT_EMAIL).trim().toLowerCase();
const listingId = process.argv[3]?.trim() || DEFAULT_LISTING_ID;

async function main() {
  const user = await admin.auth().getUserByEmail(email);

  const now = admin.firestore.Timestamp.now();
  const expiresAt = admin.firestore.Timestamp.fromMillis(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const displayName =
    user.displayName?.trim() ||
    email.split("@")[0] ||
    "מפרסם";

  const payload = {
    title: "דירת בדיקות — Lobby (פיתוח)",
    city: "תל אביב",
    neighborhood: "הצפון הישן",
    streetHint: "רחוב לדוגמה (בדיקות)",
    priceIls: 7200,
    rooms: 3,
    sizeSqm: 78,
    floor: 3,
    totalFloors: 5,
    entryDate: "מיידי",
    imageUrl: SAMPLE_IMAGE,
    gallery: [SAMPLE_IMAGE, SAMPLE_IMAGE_2],
    features: ["parking", "elevator", "balcony", "airConditioning"],
    description:
      "מודעת בדיקות לפיתוח. מתאימה לבדיקת צ׳אט, דיווחים ועמוד מודעה. אין כאן עסקה אמיתית.",
    status: "active",
    publishedAt: now,
    expiresAt,
    publisherId: user.uid,
    publisher: {
      id: user.uid,
      displayName,
      responseTimeLabel: "בדרך כלל בתוך שעה",
    },
  };

  const ref = admin.firestore().collection("listings").doc(listingId);
  await ref.set(payload, { merge: true });

  console.log("OK — listing saved");
  console.log("  email:", email);
  console.log("  uid:", user.uid);
  console.log("  listingId:", listingId);
  console.log("  path:", `/listings/${listingId}`);
}

main().catch((err) => {
  console.error(err?.message || err);
  process.exit(1);
});
