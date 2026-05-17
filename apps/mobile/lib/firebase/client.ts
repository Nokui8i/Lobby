import { getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth, type User } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { isFirebaseConfigured } from "./isConfigured";

/** כניסת Auth ל־RN כוללת persistence — לא מיוצאת בטיפוסים של `firebase/auth` */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const firebaseAuthRn = require("@firebase/auth/dist/rn/index.js") as {
  initializeAuth: (app: FirebaseApp, deps: { persistence: unknown }) => Auth;
  getReactNativePersistence: (storage: typeof AsyncStorage) => unknown;
};

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

let authSingleton: Auth | undefined;

export function getFirebaseApp(): FirebaseApp {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase is not configured (missing EXPO_PUBLIC_* env vars).");
  }

  const existing = getApps()[0];
  if (existing) {
    return existing;
  }

  return initializeApp(firebaseConfig);
}

export function getFirebaseAuth(): Auth {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase is not configured (missing EXPO_PUBLIC_* env vars).");
  }

  if (authSingleton) {
    return authSingleton;
  }

  const app = getFirebaseApp();

  let next: Auth;
  try {
    next = firebaseAuthRn.initializeAuth(app, {
      persistence: firebaseAuthRn.getReactNativePersistence(AsyncStorage),
    });
  } catch {
    next = getAuth(app);
  }
  authSingleton = next;
  return next;
}

export async function ensureFirestoreAuthReady(user: User): Promise<void> {
  const auth = getFirebaseAuth();
  await auth.authStateReady();
  if (auth.currentUser?.uid !== user.uid) {
    return;
  }
  await user.getIdToken();
}

export function getFirestoreDb() {
  return getFirestore(getFirebaseApp());
}
