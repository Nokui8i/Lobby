import { getApps, initializeApp, type FirebaseApp } from "firebase/app";
import type { User } from "firebase/auth";
import { getAuth } from "firebase/auth";
import { type Firestore, getFirestore, initializeFirestore } from "firebase/firestore";
import { isFirebaseConfigured } from "./isConfigured";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export function getFirebaseApp(): FirebaseApp {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase is not configured (missing NEXT_PUBLIC_* env vars).");
  }

  const existing = getApps()[0];
  if (existing) {
    return existing;
  }

  return initializeApp(firebaseConfig);
}

let firestoreSingleton: Firestore | undefined;

/**
 * בדפדפן: `experimentalAutoDetectLongPolling` מפחית כשלי WebChannel (400/404 על `/Listen/channel`)
 * אצל פרוקסי / אנטי־וירוס / סביבות dev. בשרת Next נשאר `getFirestore` הרגיל.
 */
export function getFirestoreDb(): Firestore {
  const app = getFirebaseApp();
  if (firestoreSingleton) {
    return firestoreSingleton;
  }

  if (typeof window === "undefined") {
    firestoreSingleton = getFirestore(app);
    return firestoreSingleton;
  }

  const forceLongPoll = process.env.NEXT_PUBLIC_LOBBY_FIRESTORE_FORCE_LONG_POLLING === "true";

  try {
    firestoreSingleton = initializeFirestore(app, {
      ...(forceLongPoll
        ? { experimentalForceLongPolling: true as const }
        : { experimentalAutoDetectLongPolling: true as const }),
    });
  } catch {
    firestoreSingleton = getFirestore(app);
  }

  return firestoreSingleton;
}

export function getFirebaseAuth() {
  return getAuth(getFirebaseApp());
}

/** מונע permission-denied מיד אחרי התחברות — ממתין ל־Auth ומחדש אסימון לפני שאילתות Firestore. */
export async function ensureFirestoreAuthReady(user: User): Promise<void> {
  const auth = getFirebaseAuth();
  await auth.authStateReady();
  if (auth.currentUser?.uid !== user.uid) {
    return;
  }
  await user.getIdToken();
}
