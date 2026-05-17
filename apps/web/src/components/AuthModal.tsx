"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLobbyAuth } from "@/contexts/LobbyAuthContext";
import { isFirebaseConfigured } from "@/lib/firebase/isConfigured";
import styles from "./AuthModal.module.css";

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
}

export function AuthModal({ open, onClose }: AuthModalProps) {
  const {
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogleForSignIn,
    signInWithGoogleForSignUp,
    completeGoogleProfileAfterSignIn,
    abandonPendingGoogleProfile,
  } = useLobbyAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  /** אחרי Google בכניסה — משתמש חדש ממלא שם לפני סגירה (בלי סשן פעיל עד השלמה) */
  const [googleAwaitingName, setGoogleAwaitingName] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      void abandonPendingGoogleProfile();
      setGoogleAwaitingName(false);
      setError(null);
      setEmail("");
      setPassword("");
      setDisplayName("");
      setMode("signin");
      setBusy(false);
    }
  }, [open, abandonPendingGoogleProfile]);

  if (!open || !isFirebaseConfigured()) {
    return null;
  }

  async function handleSubmit() {
    setError(null);
    setBusy(true);

    try {
      if (mode === "signin") {
        await signInWithEmail(email, password);
      } else {
        if (!displayName.trim()) {
          setError("נא למלא שם להצגה.");
          return;
        }
        await signUpWithEmail(email, password, displayName.trim());
      }

      setEmail("");
      setPassword("");
      setDisplayName("");
    } catch (err: unknown) {
      const code = err && typeof err === "object" && "code" in err ? String((err as { code: string }).code) : "";
      const message =
        code === "lobby/use-google"
          ? "האימייל הזה רשום עם Google — התחברו עם ׳התחברות עם Google׳ (לא עם סיסמה)."
          : code === "lobby/wrong-email-password"
            ? "אימייל או סיסמה לא נכונים."
            : code === "lobby/signin-email-or-google"
              ? "אימייל או סיסמה לא נכונים, או שהחשבון מחובר ל־Google — נסו ׳התחברות עם Google׳ לאותו מייל."
              : code === "lobby/register-use-google"
                ? "האימייל כבר רשום עם Google. השתמשו ב׳הרשמה עם Google׳ או עברו ל׳יש לי חשבון׳ והתחברו עם Google."
                : code === "lobby/email-in-use-generic"
                  ? "האימייל כבר רשום. אם נרשמתם עם Google — התחברו עם Google. אם יש לכם סיסמה — עברו ל׳יש לי חשבון׳."
                  : code === "lobby/display-name-required"
                    ? "נא למלא שם להצגה."
                    : code === "auth/invalid-email"
                      ? "כתובת האימייל לא תקינה."
                      : code === "auth/weak-password"
                        ? "סיסמה חלשה מדי (נדרשות לפחות 6 תווים)."
                        : code === "auth/email-already-in-use"
                          ? "האימייל כבר רשום. אם השתמשתם ב־Google — התחברו עם Google."
                          : "לא הצלחנו להשלים את הפעולה. נסו שוב.";
      setError(message);
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    setError(null);
    setBusy(true);

    try {
      const loginHint = email.trim() || undefined;
      if (mode === "signup") {
        if (!displayName.trim()) {
          setError("לפני Google: נא למלא איך תרצו להופיע בלובי.");
          return;
        }
        const r = await signInWithGoogleForSignUp(displayName.trim(), loginHint);
        if (r.status === "already_registered") {
          setError("החשבון כבר קיים — עברו ל־״יש לי חשבון״ והתחברו עם Google.");
          return;
        }
        setEmail("");
        setPassword("");
        setDisplayName("");
        return;
      }

      const r = await signInWithGoogleForSignIn(loginHint);
      if (r.status === "needs_display_name") {
        setGoogleAwaitingName(true);
        setDisplayName("");
        return;
      }
    } catch (err: unknown) {
      const code = err && typeof err === "object" && "code" in err ? String((err as { code: string }).code) : "";
      const message =
        code === "lobby/google-use-email-first"
          ? "המייל הזה כבר רשום עם סיסמה. התחברו עם אימייל וסיסמה (או קשרו Google מהגדרות החשבון כשיהיה זמין)."
          : code === "lobby/google-require-email"
            ? "נא להזין אימייל לפני Google."
            : code === "lobby/google-blocked-password-only"
              ? "האימייל רשום עם סיסמה — התחברו עם אימייל וסיסמה."
              : code === "lobby/google-email-mismatch"
                ? "האימייל ב-Google לא תואם לשדה האימייל."
                : code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request"
                ? "החלון נסגר לפני השלמת הכניסה."
                : code === "auth/popup-blocked"
                  ? "הדפדפן חסם את חלון ההתחברות — אפשרו חלונות קופצים לאתר."
                  : "לא הצלחנו להתחבר עם Google. ודאו שב־Firebase מופעל ספק Google.";
      setError(message);
    } finally {
      setBusy(false);
    }
  }

  async function handleCompleteGoogleName() {
    setError(null);
    if (!displayName.trim()) {
      setError("נא למלא שם להצגה.");
      return;
    }
    setBusy(true);
    try {
      await completeGoogleProfileAfterSignIn(displayName.trim());
      setGoogleAwaitingName(false);
      setDisplayName("");
      setEmail("");
      setPassword("");
    } catch (err: unknown) {
      const code = err && typeof err === "object" && "code" in err ? String((err as { code: string }).code) : "";
      setError(
        code === "lobby/display-name-required"
          ? "נא למלא שם להצגה."
          : "לא הצלחנו לשמור. נסו שוב.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (googleAwaitingName) {
    return (
      <div className={styles.overlay} role="presentation">
        <div className={styles.panel} role="dialog" aria-modal="true" aria-label="השלמת הרשמה">
          <div className={styles.header}>
            <button type="button" className={styles.close} onClick={onClose} aria-label="סגירה">
              ×
            </button>
            <div>
              <h2>כמעט סיימנו</h2>
              <p>בחרו איך תופיעו בלובי (שם להצגה).</p>
            </div>
          </div>

          <form
            className={styles.form}
            onSubmit={(event) => {
              event.preventDefault();
              void handleCompleteGoogleName();
            }}
          >
            <label className={styles.field}>
              <span>שם להצגה</span>
              <input
                type="text"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                autoComplete="name"
              />
            </label>

            {error ? <p className={styles.error}>{error}</p> : null}

            <button type="submit" className={styles.submit} disabled={busy}>
              {busy ? "שומרים…" : "המשך ללובי"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.overlay} role="presentation">
      <div className={styles.panel} role="dialog" aria-modal="true" aria-label="התחברות ללובי">
        <div className={styles.header}>
          <button type="button" className={styles.close} onClick={onClose} aria-label="סגירה">
            ×
          </button>
          <div>
            <h2>{mode === "signin" ? "כניסה ללובי" : "הרשמה ללובי"}</h2>
            <p>נדרש חשבון לדיווח, לצ׳אט ולפרסום מודעות.</p>
          </div>
        </div>

        <div className={styles.modeToggle}>
          <button
            type="button"
            className={mode === "signin" ? styles.modeActive : undefined}
            onClick={() => {
              setMode("signin");
              setError(null);
              setGoogleAwaitingName(false);
            }}
          >
            יש לי חשבון
          </button>
          <button
            type="button"
            className={mode === "signup" ? styles.modeActive : undefined}
            onClick={() => {
              setMode("signup");
              setError(null);
              setGoogleAwaitingName(false);
            }}
          >
            משתמש חדש
          </button>
        </div>

        <form
          className={styles.form}
          onSubmit={(event) => {
            event.preventDefault();
            void handleSubmit();
          }}
        >
          {mode === "signup" ? (
            <label className={styles.field}>
              <span>שם להצגה</span>
              <input
                type="text"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                autoComplete="name"
              />
            </label>
          ) : null}

          <label className={styles.field}>
            <span>אימייל</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              dir="ltr"
            />
          </label>

          <label className={styles.field}>
            <span>סיסמה</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              dir="ltr"
            />
          </label>

          {error ? <p className={styles.error}>{error}</p> : null}

          <button type="button" className={styles.google} disabled={busy} onClick={() => void handleGoogle()}>
            {mode === "signin" ? "התחברות עם Google" : "הרשמה עם Google"}
          </button>

          <div className={styles.divider}>
            <span>או</span>
          </div>

          <button type="submit" className={styles.submit} disabled={busy}>
            {busy ? "מעבדים…" : mode === "signin" ? "כניסה" : "יצירת חשבון"}
          </button>

          <p className={styles.legalNotice}>
            {mode === "signin" ? "בכניסה לשירות" : "ביצירת חשבון"} אתם מאשרים את{" "}
            <Link href="/terms" target="_blank" rel="noopener noreferrer" className={styles.legalLink}>
              תקנון השימוש
            </Link>{" "}
            ואת{" "}
            <Link href="/privacy" target="_blank" rel="noopener noreferrer" className={styles.legalLink}>
              מדיניות הפרטיות
            </Link>
            .
          </p>
        </form>
      </div>
    </div>
  );
}
