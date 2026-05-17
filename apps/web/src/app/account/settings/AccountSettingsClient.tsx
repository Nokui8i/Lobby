"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useLobbyAuth } from "@/contexts/LobbyAuthContext";
import { isFirebaseConfigured } from "@/lib/firebase/isConfigured";
import {
  fetchPushNotificationsEnabled,
  setPushNotificationsEnabled,
} from "@/lib/firebase/notifications";
import styles from "./settings.module.css";

export function AccountSettingsClient() {
  const { user, loading: authLoading, openAuthModal } = useLobbyAuth();
  const [pushEnabled, setPushEnabled] = useState(true);
  const [loadingPref, setLoadingPref] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user || !isFirebaseConfigured()) {
      setLoadingPref(false);
      return;
    }
    let cancelled = false;
    void fetchPushNotificationsEnabled(user.uid).then((enabled) => {
      if (!cancelled) {
        setPushEnabled(enabled);
        setLoadingPref(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const handleToggle = useCallback(async () => {
    if (!user || saving) {
      return;
    }
    const next = !pushEnabled;
    setPushEnabled(next);
    setSaving(true);
    try {
      await setPushNotificationsEnabled(user.uid, next);
    } catch {
      setPushEnabled(!next);
    } finally {
      setSaving(false);
    }
  }, [user, pushEnabled, saving]);

  if (!isFirebaseConfigured()) {
    return (
      <main className={styles.main}>
        <p className={styles.muted}>אין חיבור לשרת.</p>
      </main>
    );
  }

  if (authLoading || loadingPref) {
    return (
      <main className={styles.main}>
        <p className={styles.muted}>טוען…</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className={styles.main}>
        <Link href="/account" className={styles.back}>
          חזרה
        </Link>
        <p className={styles.muted}>
          <button type="button" onClick={openAuthModal} style={{ font: "inherit", fontWeight: 800 }}>
            כניסה
          </button>
        </p>
      </main>
    );
  }

  return (
    <main className={styles.main}>
      <Link href="/account" className={styles.back}>
        חזרה
      </Link>
      <h1 className={styles.title}>הגדרות</h1>
      <div className={styles.card}>
        <div className={styles.row}>
          <div>
            <div className={styles.rowLabel}>התראות Push</div>
            <div className={styles.rowHint}>באפליקציה — כשהאפליקציה סגורה</div>
          </div>
          <button
            type="button"
            className={`${styles.toggle} ${pushEnabled ? styles.toggleOn : ""}`}
            role="switch"
            aria-checked={pushEnabled}
            disabled={saving}
            onClick={() => void handleToggle()}
          >
            <span className={styles.toggleKnob} />
          </button>
        </div>
      </div>
    </main>
  );
}

