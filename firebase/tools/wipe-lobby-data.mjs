/**
 * מוחק את כל נתוני Lobby בפרויקט Firebase:
 * - Authentication (כל המשתמשים)
 * - Firestore (כל האוספים ברקורסיה, כולל תתי־אוספים)
 * - Storage (כל הקבצים בברירת המחדל)
 *
 * דרישות: הרשאות Owner/Editor על הפרויקט, ואחת מהאפשרויות:
 * - משתנה סביבה GOOGLE_APPLICATION_CREDENTIALS = נתיב לקובץ מפתח שירות JSON, או
 * - gcloud auth application-default login (אם ה־SDK מקבל ADC לפעולות Auth)
 *
 * הרצה:  node wipe-lobby-data.mjs --confirm
 */

import admin from "firebase-admin";

const PROJECT_ID = "lobby-rental-platform";
const STORAGE_BUCKET = "lobby-rental-platform.firebasestorage.app";

if (!process.argv.includes("--confirm")) {
  console.error("הוסיפו --confirm כדי לאשר מחיקה מלאה.");
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: PROJECT_ID,
  storageBucket: STORAGE_BUCKET,
});

const db = admin.firestore();

async function wipeAuth() {
  let nextPageToken;
  let total = 0;
  do {
    const result = await admin.auth().listUsers(1000, nextPageToken);
    const uids = result.users.map((u) => u.uid);
    if (uids.length > 0) {
      const del = await admin.auth().deleteUsers(uids);
      total += uids.length;
      if (del.failureCount > 0) {
        console.warn("Auth delete failures:", del.errors);
      }
    }
    nextPageToken = result.pageToken;
  } while (nextPageToken);
  console.log(`Auth: נמחקו ${total} משתמשים.`);
}

async function wipeFirestore() {
  const cols = await db.listCollections();
  let n = 0;
  for (const col of cols) {
    await db.recursiveDelete(col);
    n += 1;
    console.log(`Firestore: נמחק אוסף שורש /${col.id}`);
  }
  console.log(`Firestore: סה״כ ${n} אוספי שורש.`);
}

async function wipeStorage() {
  const bucket = admin.storage().bucket(STORAGE_BUCKET);
  const [files] = await bucket.getFiles({ autoPaginate: true });
  await Promise.all(files.map((f) => f.delete({ ignoreNotFound: true })));
  console.log(`Storage: נמחקו ${files.length} קבצים מ־gs://${STORAGE_BUCKET}`);
}

try {
  console.log(`מתחיל ניקוי מלא — ${PROJECT_ID} …`);
  await wipeAuth();
  await wipeFirestore();
  await wipeStorage();
  console.log("סיימנו.");
  process.exit(0);
} catch (err) {
  console.error("נכשל:", err.message || err);
  if (
    String(err.message || "").includes("Could not load the default credentials") ||
    String(err).includes("application default credentials")
  ) {
    console.error(`
הגדרו אחת מהאפשרויות:
  1) הורידו מפתח שירות מ־Google Cloud → IAM → Service accounts → מפתח JSON
     והריצו בפאוורשל:
     $env:GOOGLE_APPLICATION_CREDENTIALS="C:\\path\\to\\key.json"
  2) או: gcloud auth application-default login
`);
  }
  process.exit(1);
}
