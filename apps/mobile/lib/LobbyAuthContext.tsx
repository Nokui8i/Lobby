import type { User } from "firebase/auth";
import {
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  fetchSignInMethodsForEmail,
  getAdditionalUserInfo,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithCredential,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { getFirebaseAuth } from "./firebase/client";
import { isLobbyUserBanned } from "./firebase/authBanCheck";
import { ensureUserDocument } from "./firebase/ensureUserDocument";
import { isFirebaseConfigured } from "./firebase/isConfigured";
import { fetchUserProfileDisplayName, updateUserDisplayName } from "./firebase/userProfile";

export type GoogleAuthMobileResult = "closed" | "needs_display_name" | "already_registered";

interface LobbyAuthContextValue {
  user: User | null;
  displayNameForUi: string;
  loading: boolean;
  signOutUser: () => Promise<void>;
  updateDisplayName: (displayName: string) => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, displayName: string) => Promise<void>;
  signInWithGoogleIdToken: (
    idToken: string,
    options: { intent: "signin" | "signup"; signupDisplayName?: string },
  ) => Promise<GoogleAuthMobileResult>;
  completeGoogleProfileAfterSignIn: (displayName: string) => Promise<void>;
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
  const pendingGoogleIdTokenRef = useRef<string | null>(null);

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

  const updateDisplayName = useCallback(
    async (displayName: string) => {
      if (!isFirebaseConfigured()) {
        throw new Error("Firebase is not configured.");
      }
      const auth = getFirebaseAuth();
      const current = auth.currentUser;
      if (!current) {
        throw new Error("Not signed in.");
      }
      await updateUserDisplayName(current, displayName);
      await refreshProfileDisplayName(current);
    },
    [refreshProfileDisplayName],
  );

  const abandonPendingGoogleProfile = useCallback(async () => {
    const token = pendingGoogleIdTokenRef.current;
    pendingGoogleIdTokenRef.current = null;
    if (!token || !isFirebaseConfigured()) {
      return;
    }

    const auth = getFirebaseAuth();
    try {
      const cred = GoogleAuthProvider.credential(token);
      const uc = await signInWithCredential(auth, cred);
      await uc.user.delete();
    } catch {
      // אסימון פג או כשל
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

  const signInWithGoogleIdToken = useCallback(
    async (
      idToken: string,
      options: { intent: "signin" | "signup"; signupDisplayName?: string },
    ): Promise<GoogleAuthMobileResult> => {
      if (!isFirebaseConfigured()) {
        throw new Error("Firebase is not configured.");
      }

      const auth = getFirebaseAuth();

      let result;
      try {
        const credential = GoogleAuthProvider.credential(idToken);
        result = await signInWithCredential(auth, credential);
      } catch (err: unknown) {
        const c = err && typeof err === "object" && "code" in err ? String((err as { code: string }).code) : "";
        if (c === "auth/account-exists-with-different-credential") {
          await signOut(auth).catch(() => {});
          const e = new Error("ACCOUNT_EXISTS");
          (e as { code?: string }).code = "lobby/google-use-email-first";
          throw e;
        }
        throw err;
      }

      const extra = getAdditionalUserInfo(result);
      const isNew = extra?.isNewUser === true;

      if (options.intent === "signup") {
        const name = options.signupDisplayName?.trim() ?? "";
        if (!name) {
          await signOut(auth);
          const e = new Error("DISPLAY_NAME_REQUIRED");
          (e as { code?: string }).code = "lobby/display-name-required";
          throw e;
        }
        if (!isNew) {
          await signOut(auth);
          return "already_registered";
        }
        await ensureUserDocument(result.user, name);
        await refreshProfileDisplayName(result.user);
        closeAuthModal();
        return "closed";
      }

      if (isNew) {
        pendingGoogleIdTokenRef.current = idToken;
        await signOut(auth);
        return "needs_display_name";
      }

      await ensureUserDocument(result.user);
      await refreshProfileDisplayName(result.user);
      closeAuthModal();
      return "closed";
    },
    [closeAuthModal, refreshProfileDisplayName],
  );

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
      const token = pendingGoogleIdTokenRef.current;
      if (token) {
        pendingGoogleIdTokenRef.current = null;
        const cred = GoogleAuthProvider.credential(token);
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

  const value = useMemo(
    () => ({
      user,
      displayNameForUi,
      loading,
      signOutUser,
      updateDisplayName,
      signInWithEmail,
      signUpWithEmail,
      signInWithGoogleIdToken,
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
      updateDisplayName,
      signInWithEmail,
      signUpWithEmail,
      signInWithGoogleIdToken,
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
