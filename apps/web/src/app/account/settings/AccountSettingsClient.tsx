"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { PageMain } from "@/components/layout/PageMain";
import { bubble } from "@/components/bubble/styles";
import { useLobbyAuth } from "@/contexts/LobbyAuthContext";
import { isFirebaseConfigured } from "@/lib/firebase/isConfigured";
import {
  fetchPushNotificationsEnabled,
  setPushNotificationsEnabled,
} from "@/lib/firebase/notifications";
import { cn } from "@/lib/utils";

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
      <PageMain>
        <p className={bubble.subtext}>אין חיבור לשרת.</p>
      </PageMain>
    );
  }

  if (authLoading || loadingPref) {
    return (
      <PageMain>
        <p className={bubble.subtext}>טוען…</p>
      </PageMain>
    );
  }

  if (!user) {
    return (
      <PageMain>
        <Link href="/account" className="mb-4 inline-block text-sm font-bold text-brand no-underline">
          חזרה לאזור אישי
        </Link>
        <p className={bubble.subtext}>
          <button type="button" onClick={openAuthModal} className="font-bold text-brand">
            כניסה
          </button>
        </p>
      </PageMain>
    );
  }

  return (
    <PageMain>
      <div className="mx-auto w-full max-w-3xl">
        <Link href="/account" className="mb-4 inline-block text-sm font-bold text-brand no-underline">
          חזרה לאזור אישי
        </Link>
        <h1 className={cn("mb-6 text-3xl font-bold tracking-tight", bubble.heading)}>הגדרות</h1>
        <div className={cn(bubble.cardPad)}>
          <div className="flex flex-row-reverse items-center justify-between gap-4">
            <div className="text-right">
              <p className="text-base font-bold text-graphite">התראות Push</p>
              <p className={cn(bubble.subtext, "mt-1")}>באפליקציה — כשהאפליקציה סגורה</p>
            </div>
            <button
              type="button"
              className={cn(
                "relative h-8 w-[52px] shrink-0 rounded-full border-0 transition",
                pushEnabled ? "bg-brand" : "bg-[#d1d5db]",
              )}
              role="switch"
              aria-checked={pushEnabled}
              disabled={saving}
              onClick={() => void handleToggle()}
            >
              <span
                className={cn(
                  "absolute top-[3px] right-[3px] h-[26px] w-[26px] rounded-full bg-white shadow transition",
                  pushEnabled && "-translate-x-5",
                )}
              />
            </button>
          </div>
        </div>
      </div>
    </PageMain>
  );
}
