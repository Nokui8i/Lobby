/**
 * Grant staffRole custom claim (moderator | admin | owner).
 *
 *   npm run set-staff-claim -- <uid> <role>
 *
 * Credentials (first match wins):
 *   1. GOOGLE_APPLICATION_CREDENTIALS
 *   2. firebase/tools/serviceAccountKey.json
 *   3. Application Default Credentials (gcloud auth application-default login)
 */
import admin from "firebase-admin";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const uid = process.argv[2];
const role = process.argv[3];
const VALID = ["moderator", "admin", "owner"];
const PROJECT_ID = process.env.FIREBASE_PROJECT_ID ?? "lobby-rental-platform";

if (!uid || !VALID.includes(role)) {
  console.error("Usage: npm run set-staff-claim -- <uid> <moderator|admin|owner>");
  process.exit(1);
}

const toolsDir = dirname(fileURLToPath(import.meta.url));
const localKey = join(toolsDir, "..", "serviceAccountKey.json");

function initAdmin() {
  if (admin.apps.length) {
    return;
  }
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS || existsSync(localKey)) {
    const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS ?? localKey;
    const serviceAccount = JSON.parse(readFileSync(keyPath, "utf8"));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id ?? PROJECT_ID,
    });
    return;
  }
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: PROJECT_ID,
  });
}

initAdmin();

try {
  await admin.auth().setCustomUserClaims(uid, { staffRole: role });
  console.log(`staffRole=${role} set for uid=${uid}`);
  console.log("Sign out and sign in again in the admin app for the claim to apply.");
} catch (err) {
  console.error(err);
  process.exit(1);
}
