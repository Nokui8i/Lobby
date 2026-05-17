"use client";

import { signInWithEmailAndPassword } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { resolveStaffRoleForAdminUser } from "@/lib/staffAuth";
import { isFirebaseConfigured } from "@/lib/firebase/isConfigured";
import styles from "./login.module.css";

export default function AdminLoginPage() {
  const router = useRouter();
  const { isStaff, isLoading } = useAdminAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && isStaff) {
      router.replace("/");
    }
  }, [isLoading, isStaff, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    if (!isFirebaseConfigured()) {
      setError("חסר חיבור Firebase. הגדירו .env.local");
      setSubmitting(false);
      return;
    }

    try {
      const auth = getFirebaseAuth();
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      const role = await resolveStaffRoleForAdminUser(cred.user);
      if (!role) {
        await auth.signOut();
        setError("אין הרשאות צוות למשתמש הזה.");
        return;
      }
      router.replace("/");
    } catch {
      setError("אימייל או סיסמה שגויים.");
    } finally {
      setSubmitting(false);
    }
  }

  if (isLoading || isStaff) {
    return (
      <div className={styles.page}>
        <div className={styles.spinner} aria-hidden="true" />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.brand}>
          <span className={styles.mark}>L</span>
          <div>
            <strong>Lobby</strong>
            <span>כניסת צוות</span>
          </div>
        </div>

        <h1>התחברות לניהול</h1>
        <p className={styles.hint}>רק משתמשים עם הרשאת צוות יכולים להיכנס.</p>

        <form className={styles.form} onSubmit={(e) => void handleSubmit(e)}>
          <label>
            אימייל
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label>
            סיסמה
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>

          {error ? (
            <p className={styles.error} role="alert">
              {error}
            </p>
          ) : null}

          <button type="submit" className={styles.submit} disabled={submitting}>
            {submitting ? "מתחבר…" : "כניסה"}
          </button>
        </form>
      </div>
    </div>
  );
}
