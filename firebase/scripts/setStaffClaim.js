/**
 * Grant staff role via Firebase Auth custom claims.
 *
 * Usage (from repo root, with service account):
 *   node firebase/scripts/setStaffClaim.js <uid> <moderator|admin|owner>
 *
 * Example:
 *   node firebase/scripts/setStaffClaim.js YOUR_UID owner
 */
const admin = require("firebase-admin");
const path = require("node:path");

const role = process.argv[3];
const uid = process.argv[2];

const VALID = ["moderator", "admin", "owner"];

if (!uid || !VALID.includes(role)) {
  console.error("Usage: node firebase/scripts/setStaffClaim.js <uid> <moderator|admin|owner>");
  process.exit(1);
}

const keyPath = path.join(__dirname, "..", "tools", "serviceAccountKey.json");
// eslint-disable-next-line import/no-dynamic-require
const serviceAccount = require(keyPath);

if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

admin
  .auth()
  .setCustomUserClaims(uid, { staffRole: role })
  .then(() => {
    console.log(`staffRole=${role} set for uid=${uid}`);
    console.log("User must sign out and sign in again for claims to apply.");
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
