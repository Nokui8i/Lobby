import { getApps, initializeApp, type FirebaseApp } from "firebase/app";
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
  return getApps()[0] ?? initializeApp(firebaseConfig);
}

let firestoreSingleton: Firestore | undefined;

export function getFirestoreDb(): Firestore {
  const app = getFirebaseApp();
  if (firestoreSingleton) {
    return firestoreSingleton;
  }
  if (typeof window === "undefined") {
    firestoreSingleton = getFirestore(app);
    return firestoreSingleton;
  }
  try {
    firestoreSingleton = initializeFirestore(app, {
      experimentalAutoDetectLongPolling: true,
    });
  } catch {
    firestoreSingleton = getFirestore(app);
  }
  return firestoreSingleton;
}

export function getFirebaseAuth() {
  return getAuth(getFirebaseApp());
}
