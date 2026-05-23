"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Bell, ChevronLeft, LogOut, Mail } from "lucide-react";
import { USER_DISPLAY_NAME_MAX_LENGTH } from "@lobby/shared";
import { AccountAreaShell } from "@/app/account/AccountAreaShell";
import { bubble } from "@/components/bubble/styles";
import { useLobbyAuth } from "@/contexts/LobbyAuthContext";
import { useLobbyNotificationsOptional } from "@/contexts/LobbyNotificationsContext";
import { isFirebaseConfigured } from "@/lib/firebase/isConfigured";
import {
  fetchPushNotificationsEnabled,
  setPushNotificationsEnabled,
} from "@/lib/firebase/notifications";
import { cn } from "@/lib/utils";

function SettingsIconTile({ children }: { children: ReactNode }) {
  return (
    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand/10 text-brand [&>svg]:h-[18px] [&>svg]:w-[18px]">
      {children}
    </span>
  );
}

function SettingsCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-1 px-0.5 text-xs font-bold text-graphite/60">{title}</h2>
      <div className="bubble-card overflow-hidden p-0.5" style={{ borderRadius: 14 }}>
        {children}
      </div>
    </section>
  );
}

function SettingsLinkRow({
  href,
  label,
  hint,
  icon,
}: {
  href: string;
  label: string;
  hint?: string;
  icon: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex flex-row-reverse items-center gap-3 rounded-xl px-4 py-3 text-inherit no-underline transition hover:bg-soft"
    >
      <SettingsIconTile>{icon}</SettingsIconTile>
      <span className="min-w-0 flex-1 text-right">
        <span className="block text-[15px] font-semibold leading-snug text-graphite">{label}</span>
        {hint ? <span className="mt-0.5 block text-[13px] font-medium leading-snug text-graphite/55">{hint}</span> : null}
      </span>
      <ChevronLeft className="size-5 shrink-0 text-graphite/35" aria-hidden />
    </Link>
  );
}

function SettingsToggleRow({
  label,
  hint,
  icon,
  checked,
  disabled,
  onToggle,
}: {
  label: string;
  hint: string;
  icon: ReactNode;
  checked: boolean;
  disabled?: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex flex-row-reverse items-center gap-3 rounded-xl px-4 py-3">
      <SettingsIconTile>{icon}</SettingsIconTile>
      <span className="min-w-0 flex-1 text-right">
        <span className="block text-[15px] font-semibold leading-snug text-graphite">{label}</span>
        <span className="mt-0.5 block text-[13px] font-medium leading-snug text-graphite/55">{hint}</span>
      </span>
      <button
        type="button"
        className={cn(
          "relative h-[18px] w-8 shrink-0 rounded-full border-0 transition disabled:opacity-50",
          checked ? "bg-brand" : "bg-slate-200",
        )}
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={onToggle}
      >
        <span
          className={cn(
            "absolute top-0.5 right-0.5 h-3.5 w-3.5 rounded-full bg-white shadow-sm transition",
            checked && "-translate-x-3.5",
          )}
        />
      </button>
    </div>
  );
}

export function AccountSettingsClient() {
  const { user, loading: authLoading, openAuthModal, displayNameForUi, updateDisplayName, signOutUser } =
    useLobbyAuth();
  const [pushEnabled, setPushEnabled] = useState(true);
  const [loadingPref, setLoadingPref] = useState(true);
  const [savingPush, setSavingPush] = useState(false);
  const [displayNameDraft, setDisplayNameDraft] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [nameMessage, setNameMessage] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);

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

  useEffect(() => {
    if (user) {
      setDisplayNameDraft(displayNameForUi);
    }
  }, [user, displayNameForUi]);

  const handleTogglePush = useCallback(async () => {
    if (!user || savingPush) {
      return;
    }
    const next = !pushEnabled;
    setPushEnabled(next);
    setSavingPush(true);
    try {
      await setPushNotificationsEnabled(user.uid, next);
    } catch {
      setPushEnabled(!next);
    } finally {
      setSavingPush(false);
    }
  }, [user, pushEnabled, savingPush]);

  const handleSaveName = useCallback(async () => {
    if (!user || savingName) {
      return;
    }
    const trimmed = displayNameDraft.trim();
    if (trimmed === displayNameForUi.trim()) {
      setNameMessage("אין שינוי לשמירה.");
      setNameError(null);
      return;
    }
    setSavingName(true);
    setNameMessage(null);
    setNameError(null);
    try {
      await updateDisplayName(displayNameDraft);
      setNameMessage("השם עודכן.");
    } catch (e) {
      setNameError(e instanceof Error ? e.message : "לא הצלחנו לשמור.");
    } finally {
      setSavingName(false);
    }
  }, [user, savingName, displayNameDraft, displayNameForUi, updateDisplayName]);

  if (!isFirebaseConfigured()) {
    return <p className="text-sm font-medium text-graphite/60">אין חיבור לשרת.</p>;
  }

  if (authLoading || loadingPref) {
    return <p className="text-sm font-medium text-graphite/60">טוען…</p>;
  }

  if (!user) {
    return (
      <>
        <Link href="/account" className="mb-3 inline-block text-sm font-extrabold text-brand no-underline">
          חזרה
        </Link>
        <p className="text-sm font-medium text-graphite/60">
          <button type="button" onClick={openAuthModal} className="font-extrabold text-brand">
            כניסה
          </button>
        </p>
      </>
    );
  }

  const email = user.email ?? "—";
  const nameDirty = displayNameDraft.trim() !== displayNameForUi.trim();
  const displayName = displayNameForUi.trim() || email.split("@")[0] || "משתמש";
  const initial = displayName.charAt(0) || "?";

  return (
    <AccountAreaShell title="הגדרות חשבון">
      <div className="space-y-3">
            <SettingsCard title="פרופיל">
              <div className="flex flex-row-reverse items-center gap-4 border-b border-slate-100 px-4 py-4">
                <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-brand text-lg font-black text-white">
                  {initial}
                </div>
                <div className="min-w-0 flex-1 text-right">
                  <p className="truncate text-base font-bold text-graphite">{displayName}</p>
                  <p className="mt-0.5 truncate text-sm font-medium text-graphite/55">{email}</p>
                </div>
              </div>
              <div className="px-4 py-4">
                <label htmlFor="settings-display-name" className={cn(bubble.label, "mb-1.5 block text-right text-[15px]")}>
                  שם להצגה
                </label>
                <p className={cn(bubble.subtext, "mb-3 text-right text-[13px]")}>
                  עד {USER_DISPLAY_NAME_MAX_LENGTH} תווים · מופיע במודעות ובצ׳אט
                </p>
                <input
                  id="settings-display-name"
                  type="text"
                  className={cn(bubble.input, "text-[15px]")}
                  dir="rtl"
                  maxLength={USER_DISPLAY_NAME_MAX_LENGTH}
                  value={displayNameDraft}
                  onChange={(e) => {
                    setDisplayNameDraft(e.target.value);
                    setNameMessage(null);
                    setNameError(null);
                  }}
                />
                {nameError ? (
                  <p className="mt-2 text-right text-sm font-semibold text-red-700" role="alert">
                    {nameError}
                  </p>
                ) : null}
                {nameMessage ? (
                  <p className="mt-2 text-right text-sm font-semibold text-emerald-700" role="status">
                    {nameMessage}
                  </p>
                ) : null}
                <button
                  type="button"
                  className="btn-puffy mt-2 inline-flex h-8 items-center rounded-full px-4 text-[12px] font-semibold disabled:opacity-50"
                  disabled={savingName || !nameDirty || !displayNameDraft.trim()}
                  onClick={() => void handleSaveName()}
                >
                  {savingName ? "שומר…" : "שמירת שם"}
                </button>
              </div>
              <div className="mx-4 border-t border-slate-100" />
              <div className="flex flex-row-reverse items-center gap-3 px-4 py-3.5">
                <SettingsIconTile>
                  <Mail className="h-4 w-4" />
                </SettingsIconTile>
                <div className="min-w-0 flex-1 text-right">
                  <p className="text-sm font-semibold text-graphite/60">אימייל (לקריאה בלבד)</p>
                  <p className="mt-1 break-all text-[15px] font-bold text-graphite">{email}</p>
                </div>
              </div>
            </SettingsCard>

            <SettingsCard title="התראות">
              <div>
                <SettingsToggleRow
                  icon={<Bell />}
                  label="התראות Push"
                  hint="באפליקציית Lobby — גם כשהאפליקציה סגורה"
                  checked={pushEnabled}
                  disabled={savingPush}
                  onToggle={() => void handleTogglePush()}
                />
                <div className="mx-4 border-t border-slate-100" />
                <SettingsLinkRow
                  href="/account/notifications"
                  icon={<Bell />}
                  label="התראות במערכת"
                  hint="מודעות, צ׳אט ופניות"
                />
              </div>
            </SettingsCard>

            <div className="bubble-card p-1 lg:hidden" style={{ borderRadius: 14 }}>
              <button
                type="button"
                className="flex w-full flex-row-reverse items-center gap-3 rounded-xl px-4 py-3 text-[15px] font-semibold text-graphite/75 transition hover:bg-soft"
                onClick={() => void signOutUser()}
              >
                <SettingsIconTile>
                  <LogOut className="h-4 w-4" />
                </SettingsIconTile>
                התנתקות
              </button>
            </div>
      </div>
    </AccountAreaShell>
  );
}
