"use client";

import type { OAuthCredential, User } from "firebase/auth";
import {
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  fetchSignInMethodsForEmail,
  getAdditionalUserInfo,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithCredential,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { isLobbyUserBanned } from "@/lib/firebase/authBanCheck";
import { ensureUserDocument } from "@/lib/firebase/ensureUserDocument";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { isFirebaseConfigured } from "@/lib/firebase/isConfigured";
import { fetchUserProfileDisplayName } from "@/lib/firebase/userProfile";

export type GoogleAuthModalResult =
  | { status: "closed" }
  | { status: "needs_display_name" }
  | { status: "already_registered" };

interface LobbyAuthContextValue {
  user: User | null;
  /** שם להצגה: Firestore → Auth → קידומת אימייל */
  displayNameForUi: string;
  loading: boolean;
  signOutUser: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, displayName: string) => Promise<void>;
  /** כניסה עם Google — ללא חובת אימייל; אם יש אימייל בשדה משמש רק כ־login_hint לגוגל */
  signInWithGoogleForSignIn: (loginHintEmail?: string) => Promise<GoogleAuthModalResult>;
  /** הרשמה עם Google — שם חובה; אימייל בשדה אופציונלי ל־login_hint */
  signInWithGoogleForSignUp: (displayName: string, loginHintEmail?: string) => Promise<GoogleAuthModalResult>;
  completeGoogleProfileAfterSignIn: (displayName: string) => Promise<void>;
  /** סגירת מודל לפני השלמת שם — מוחק משתמש Auth זמני שנוצר ב-Google */
  abandonPendingGoogleProfile: () => Promise<void>;
  authModalOpen: boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;
}

const LobbyAuthContext = createContext<LobbyAuthContextValue | null>(null);

export function LobbyAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profileDisplayName, setProfileDisplayName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const pendingGoogleOAuthCredentialRef = useRef<OAuthCredential | null>(null);

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      setUser(null);
      setProfileDisplayName(null);
      setLoading(false);
      return;
    }

    const auth = getFirebaseAuth();
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      void (async () => {
        if (nextUser) {
          const banned = await isLobbyUserBanned(nextUser);
          if (banned) {
            await signOut(auth);
            setUser(null);
            setProfileDisplayName(null);
            setLoading(false);
            return;
          }
        }
        setUser(nextUser);
        setLoading(false);
        if (!nextUser) {
          setProfileDisplayName(null);
          return;
        }
        const uid = nextUser.uid;
        void fetchUserProfileDisplayName(uid).then((n) => {
          if (getFirebaseAuth().currentUser?.uid === uid) {
            setProfileDisplayName(n);
          }
        });
      })();
    });

    return () => unsubscribe();
  }, []);

  const openAuthModal = useCallback(() => setAuthModalOpen(true), []);
  const closeAuthModal = useCallback(() => setAuthModalOpen(false), []);

  const refreshProfileDisplayName = useCallback(async (u: User) => {
    const n = await fetchUserProfileDisplayName(u.uid);
    if (getFirebaseAuth().currentUser?.uid === u.uid) {
      setProfileDisplayName(n);
    }
  }, []);

  const signOutUser = useCallback(async () => {
    if (!isFirebaseConfigured()) {
      return;
    }

    await signOut(getFirebaseAuth());
  }, []);

  const abandonPendingGoogleProfile = useCallback(async () => {
    const cred = pendingGoogleOAuthCredentialRef.current;
    pendingGoogleOAuthCredentialRef.current = null;
    if (!cred || !isFirebaseConfigured()) {
      return;
    }

    const auth = getFirebaseAuth();
    try {
      const userCred = await signInWithCredential(auth, cred);
      await userCred.user.delete();
    } catch {
      // אם האסימון פג או נכשל — רק נתנתק
    } finally {
      await signOut(auth).catch(() => {});
    }
  }, []);

  const signInWithEmail = useCallback(
    async (email: string, password: string) => {
      if (!isFirebaseConfigured()) {
        throw new Error("Firebase is not configured.");
      }

      const auth = getFirebaseAuth();
      const trimmed = email.trim();

      try {
        const credential = await signInWithEmailAndPassword(auth, trimmed, password);
        await ensureUserDocument(credential.user);
        await refreshProfileDisplayName(credential.user);
        closeAuthModal();
      } catch (err: unknown) {
        const code = err && typeof err === "object" && "code" in err ? String((err as { code: string }).code) : "";
        if (
          code !== "auth/user-not-found" &&
          code !== "auth/wrong-password" &&
          code !== "auth/invalid-credential"
        ) {
          throw err;
        }

        /** כשמופעלת הגנת enumeration בפרויקט, fetchSignInMethodsForEmail עלול להחזיר [] תמיד — לא לסמוך עליו לבד */
        let methods: string[] = [];
        try {
          methods = await fetchSignInMethodsForEmail(auth, trimmed);
        } catch {
          methods = [];
        }

        const hasGoogle = methods.includes(GoogleAuthProvider.PROVIDER_ID);
        const hasPassword = methods.includes(EmailAuthProvider.EMAIL_PASSWORD_SIGN_IN_METHOD);

        if (methods.length > 0 && hasGoogle && !hasPassword) {
          const e = new Error("USE_GOOGLE");
          (e as { code?: string }).code = "lobby/use-google";
          throw e;
        }
        if (methods.length > 0 && hasPassword) {
          const e = new Error("WRONG_PASSWORD");
          (e as { code?: string }).code = "lobby/wrong-email-password";
          throw e;
        }

        if (code === "auth/wrong-password") {
          const e = new Error("WRONG_PASSWORD");
          (e as { code?: string }).code = "lobby/wrong-email-password";
          throw e;
        }

        const e = new Error("SIGNIN_FAILED");
        (e as { code?: string }).code = "lobby/signin-email-or-google";
        throw e;
      }
    },
    [closeAuthModal, refreshProfileDisplayName],
  );

  const signUpWithEmail = useCallback(
    async (email: string, password: string, displayName: string) => {
      if (!isFirebaseConfigured()) {
        throw new Error("Firebase is not configured.");
      }

      const name = displayName.trim();
      if (!name) {
        const e = new Error("DISPLAY_NAME_REQUIRED");
        (e as { code?: string }).code = "lobby/display-name-required";
        throw e;
      }

      const auth = getFirebaseAuth();
      const trimmedEmail = email.trim();

      try {
        const credential = await createUserWithEmailAndPassword(auth, trimmedEmail, password);
        await ensureUserDocument(credential.user, name);
        await refreshProfileDisplayName(credential.user);
        closeAuthModal();
      } catch (err: unknown) {
        const code = err && typeof err === "object" && "code" in err ? String((err as { code: string }).code) : "";
        if (code !== "auth/email-already-in-use") {
          throw err;
        }

        try {
          const methods = await fetchSignInMethodsForEmail(auth, trimmedEmail);
          const hasGoogle = methods.includes(GoogleAuthProvider.PROVIDER_ID);
          const hasPassword = methods.includes(EmailAuthProvider.EMAIL_PASSWORD_SIGN_IN_METHOD);
          if (methods.length > 0 && hasGoogle && !hasPassword) {
            const e = new Error("ALREADY_GOOGLE");
            (e as { code?: string }).code = "lobby/register-use-google";
            throw e;
          }
        } catch (inner: unknown) {
          const ic = inner && typeof inner === "object" && "code" in inner ? String((inner as { code: string }).code) : "";
          if (ic === "lobby/register-use-google") {
            throw inner;
          }
        }

        const e = new Error("EMAIL_IN_USE");
        (e as { code?: string }).code = "lobby/email-in-use-generic";
        throw e;
      }
    },
    [closeAuthModal, refreshProfileDisplayName],
  );

  const runGooglePopup = useCallback(async (loginHint?: string) => {
    const provider = new GoogleAuthProvider();
    const hint = loginHint?.trim();
    provider.setCustomParameters(
      hint ? { prompt: "select_account", login_hint: hint } : { prompt: "select_account" },
    );
    return signInWithPopup(getFirebaseAuth(), provider);
  }, []);

  const signInWithGoogleForSignIn = useCallback(
    async (loginHintEmail?: string): Promise<GoogleAuthModalResult> => {
      if (!isFirebaseConfigured()) {
        throw new Error("Firebase is not configured.");
      }

      const auth = getFirebaseAuth();
      const hint = loginHintEmail?.trim() || undefined;

      let userCred;
      try {
        userCred = await runGooglePopup(hint);
      } catch (err: unknown) {
        const c = err && typeof err === "object" && "code" in err ? String((err as { code: string }).code) : "";
        if (c === "auth/account-exists-with-different-credential") {
          const e = new Error("ACCOUNT_EXISTS");
          (e as { code?: string }).code = "lobby/google-use-email-first";
          throw e;
        }
        throw err;
      }

      const extra = getAdditionalUserInfo(userCred);
      const isNew = extra?.isNewUser === true;

      if (isNew) {
        const cred = GoogleAuthProvider.credentialFromResult(userCred);
        if (!cred) {
          await signOut(auth);
          throw new Error("Missing Google credential.");
        }
        pendingGoogleOAuthCredentialRef.current = cred;
        await signOut(auth);
        return { status: "needs_display_name" };
      }

      await ensureUserDocument(userCred.user);
      await refreshProfileDisplayName(userCred.user);
      closeAuthModal();
      return { status: "closed" };
    },
    [closeAuthModal, refreshProfileDisplayName, runGooglePopup],
  );

  const signInWithGoogleForSignUp = useCallback(
    async (displayName: string, loginHintEmail?: string): Promise<GoogleAuthModalResult> => {
      if (!isFirebaseConfigured()) {
        throw new Error("Firebase is not configured.");
      }

      const name = displayName.trim();
      if (!name) {
        const e = new Error("DISPLAY_NAME_REQUIRED");
        (e as { code?: string }).code = "lobby/display-name-required";
        throw e;
      }

      const hint = loginHintEmail?.trim() || undefined;

      let credential;
      try {
        credential = await runGooglePopup(hint);
      } catch (err: unknown) {
        const c = err && typeof err === "object" && "code" in err ? String((err as { code: string }).code) : "";
        if (c === "auth/account-exists-with-different-credential") {
          const e = new Error("ACCOUNT_EXISTS");
          (e as { code?: string }).code = "lobby/google-use-email-first";
          throw e;
        }
        throw err;
      }

      const extra = getAdditionalUserInfo(credential);
      const isNew = extra?.isNewUser === true;

      if (!isNew) {
        await signOut(getFirebaseAuth());
        return { status: "already_registered" };
      }

      await ensureUserDocument(credential.user, name);
      await refreshProfileDisplayName(credential.user);
      closeAuthModal();
      return { status: "closed" };
    },
    [closeAuthModal, refreshProfileDisplayName, runGooglePopup],
  );

  const displayNameForUi = useMemo(() => {
    if (!user) {
      return "";
    }
    const fromProfile = profileDisplayName?.trim();
    if (fromProfile) {
      return fromProfile;
    }
    const fromAuth = user.displayName?.trim();
    if (fromAuth) {
      return fromAuth;
    }
    return user.email?.split("@")[0]?.trim() || "מפרסם";
  }, [user, profileDisplayName]);

  const completeGoogleProfileAfterSignIn = useCallback(
    async (displayName: string) => {
      if (!isFirebaseConfigured()) {
        throw new Error("Firebase is not configured.");
      }

      const name = displayName.trim();
      if (!name) {
        const e = new Error("DISPLAY_NAME_REQUIRED");
        (e as { code?: string }).code = "lobby/display-name-required";
        throw e;
      }

      const auth = getFirebaseAuth();
      const cred = pendingGoogleOAuthCredentialRef.current;
      if (cred) {
        pendingGoogleOAuthCredentialRef.current = null;
        const signed = await signInWithCredential(auth, cred);
        await ensureUserDocument(signed.user, name);
        await refreshProfileDisplayName(signed.user);
        closeAuthModal();
        return;
      }

      const current = auth.currentUser;
      if (current) {
        await ensureUserDocument(current, name);
        await refreshProfileDisplayName(current);
        closeAuthModal();
        return;
      }

      throw new Error("No pending Google sign-in.");
    },
    [closeAuthModal, refreshProfileDisplayName],
  );

  const value = useMemo(
    () => ({
      user,
      displayNameForUi,
      loading,
      signOutUser,
      signInWithEmail,
      signUpWithEmail,
      signInWithGoogleForSignIn,
      signInWithGoogleForSignUp,
      completeGoogleProfileAfterSignIn,
      abandonPendingGoogleProfile,
      authModalOpen,
      openAuthModal,
      closeAuthModal,
    }),
    [
      user,
      displayNameForUi,
      loading,
      signOutUser,
      signInWithEmail,
      signUpWithEmail,
      signInWithGoogleForSignIn,
      signInWithGoogleForSignUp,
      completeGoogleProfileAfterSignIn,
      abandonPendingGoogleProfile,
      authModalOpen,
      openAuthModal,
      closeAuthModal,
    ],
  );

  return <LobbyAuthContext.Provider value={value}>{children}</LobbyAuthContext.Provider>;
}

export function useLobbyAuth() {
  const ctx = useContext(LobbyAuthContext);

  if (!ctx) {
    throw new Error("useLobbyAuth must be used within LobbyAuthProvider");
  }

  return ctx;
}
