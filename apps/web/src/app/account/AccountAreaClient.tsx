"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useLobbyNotificationsOptional } from "@/contexts/LobbyNotificationsContext";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Bell, Heart, LogOut, Settings, Eye } from "lucide-react";
import { SAVED_LISTINGS_TITLE_HE, type RentalListing } from "@lobby/shared";
import { useLobbyAuth } from "@/contexts/LobbyAuthContext";
import { isFirebaseConfigured } from "@/lib/firebase/isConfigured";
import { fetchMyListingsFromFirestore } from "@/lib/firebase/listingQueries";
import { PageMain } from "@/components/layout/PageMain";
import { AccountListingRow } from "./AccountListingRow";
import { cn } from "@/lib/utils";

type AccountTab = "active" | "draft" | "offFeed";

function listingMatchesTab(listing: RentalListing, tab: AccountTab): boolean {
  if (tab === "active") {
    return (
      listing.status === "active" ||
      listing.status === "frozen" ||
      listing.status === "pending_review"
    );
  }
  if (tab === "draft") {
    return listing.status === "draft";
  }
  return listing.status === "expired" || listing.status === "removed" || listing.status === "rented";
}

const TAB_LABELS: Record<AccountTab, string> = {
  active: "פעילות בלוח",
  draft: "טיוטות",
  offFeed: "לא מוצגות",
};

export function AccountAreaClient() {
  const { user, loading, openAuthModal, signOutUser, displayNameForUi } = useLobbyAuth();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") === "draft" ? "draft" : "active";
  const [tab, setTab] = useState<AccountTab>(initialTab);
  const [rows, setRows] = useState<RentalListing[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState(false);

  const load = useCallback(async () => {
    if (!user || !isFirebaseConfigured()) {
      setRows([]);
      return;
    }
    setListLoading(true);
    setListError(false);
    try {
      const data = await fetchMyListingsFromFirestore(user.uid);
      setRows(data);
    } catch {
      setRows([]);
      setListError(true);
    } finally {
      setListLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => rows.filter((l) => listingMatchesTab(l, tab)), [rows, tab]);
  const moderationDraftCount = useMemo(
    () => rows.filter((l) => l.status === "draft" && Boolean(l.moderationDraftNote?.trim())).length,
    [rows],
  );
  const activeCount = useMemo(
    () => rows.filter((l) => l.status === "active" || l.status === "pending_review").length,
    [rows],
  );
  const draftCount = useMemo(() => rows.filter((l) => l.status === "draft").length, [rows]);
  const notifCtx = useLobbyNotificationsOptional();
  const notifUnread = notifCtx?.unreadCount ?? 0;

  const displayName = displayNameForUi.trim() || user?.email?.split("@")[0] || "משתמש";
  const initial = displayName.charAt(0) || "?";

  useEffect(() => {
    if (searchParams.get("tab") === "draft") {
      setTab("draft");
    }
  }, [searchParams]);

  if (!isFirebaseConfigured()) {
    return (
      <PageMain>
        <p className="text-sm text-graphite/60">Firebase אינו מוגדר — לא ניתן לטעון את האזור האישי.</p>
      </PageMain>
    );
  }

  if (loading) {
    return (
      <PageMain>
        <p className="text-sm text-graphite/60">טוען…</p>
      </PageMain>
    );
  }

  if (!user) {
    return (
      <PageMain>
        <h1 className="mb-4 text-3xl font-black text-graphite">האזור האישי</h1>
        <button type="button" className="btn-puffy px-8 py-3 text-sm" onClick={openAuthModal}>
          התחברות / הרשמה
        </button>
      </PageMain>
    );
  }

  const sidebarLinks: { label: string; icon: ReactNode; href: string; badge?: number }[] = [
    { label: SAVED_LISTINGS_TITLE_HE, icon: <Heart className="h-4 w-4" />, href: "/saved" },
    { label: "התראות", icon: <Bell className="h-4 w-4" />, href: "/account/notifications", badge: notifUnread },
    { label: "הגדרות חשבון", icon: <Settings className="h-4 w-4" />, href: "/account/settings" },
  ];

  return (
    <PageMain>
      <div className="mx-auto w-full max-w-[1280px]">
        <div className="bubble-card flex flex-col items-center gap-5 p-5 md:flex-row" style={{ borderRadius: 16 }}>
          <div className="grid h-16 w-16 place-items-center rounded-full bg-brand text-xl font-black text-white">{initial}</div>
          <div className="flex-1 text-center md:text-right">
            <h1 className="text-xl font-bold text-graphite">{displayName}</h1>
            <p className="mt-0.5 text-xs text-graphite/50">{user.email}</p>
            <div className="mt-2 flex flex-wrap justify-center gap-1.5 md:justify-start">
              <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                {activeCount > 0 ? `${activeCount} מודעות פעילות` : "אין מודעות פעילות"}
              </span>
              {draftCount > 0 ? (
                <span className="rounded-full bg-soft px-2.5 py-0.5 text-[11px] font-medium text-graphite/70">
                  {draftCount} טיוטות
                </span>
              ) : null}
            </div>
          </div>
          <div className="flex gap-2">
            <Link href="/publish" className="btn-puffy inline-flex h-10 items-center rounded-full px-5 text-[13px] font-semibold">
              פרסום מודעה
            </Link>
            <Link
              href="/account/settings"
              className="grid h-10 w-10 place-items-center rounded-full border border-graphite/10 bg-soft text-graphite/60 transition hover:text-brand"
              aria-label="הגדרות"
            >
              <Settings className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3">
          {[
            { icon: <Eye />, label: "צפיות במודעות", value: String(activeCount) },
            { icon: <Bell />, label: "התראות", value: notifUnread > 0 ? String(notifUnread) : "0", href: "/account/notifications" },
            { icon: <Heart />, label: SAVED_LISTINGS_TITLE_HE, value: "—", href: "/saved" },
          ].map((s) => {
            const inner = (
              <div className="bubble-card p-4" style={{ borderRadius: 14 }}>
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-brand/10 text-brand [&>svg]:h-4 [&>svg]:w-4">{s.icon}</div>
                <div className="mt-3 text-xl font-bold text-graphite">{s.value}</div>
                <div className="mt-0.5 text-[11px] text-graphite/50">{s.label}</div>
              </div>
            );
            if ("href" in s && s.href) {
              return (
                <Link key={s.label} href={s.href} className="block no-underline transition hover:-translate-y-0.5">
                  {inner}
                </Link>
              );
            }
            return <div key={s.label}>{inner}</div>;
          })}
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-[240px_1fr]">
          <aside className="bubble-card h-fit p-3" style={{ borderRadius: 14 }}>
            <p className="mb-2 px-3 text-xs font-semibold text-graphite/50">ניווט</p>
            {sidebarLinks.map((it) => (
              <Link key={it.href} href={it.href} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-right text-[13px] font-medium text-graphite/75 no-underline transition hover:bg-soft">
                {it.icon}
                {it.label}
                {it.badge && it.badge > 0 ? (
                  <span className="mr-auto rounded-full bg-brand px-1.5 text-[10px] font-bold text-white">{it.badge}</span>
                ) : null}
              </Link>
            ))}
            <button
              type="button"
              className="mt-1 flex w-full cursor-pointer items-center gap-2.5 rounded-lg border-0 bg-transparent px-3 py-2 text-right text-[13px] font-medium text-graphite/75 transition hover:bg-soft"
              onClick={() => void signOutUser()}
            >
              <LogOut className="h-4 w-4" />
              התנתקות
            </button>

            <div className="mt-3 border-t border-graphite/5 pt-3">
              <p className="mb-2 px-3 text-xs font-semibold text-graphite/50">המודעות שלי</p>
              {(["active", "draft", "offFeed"] as AccountTab[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  className={cn(
                    "mb-1 flex w-full items-center justify-between rounded-lg px-3 py-2 text-right text-[13px] font-medium transition",
                    tab === t ? "bg-brand/10 text-brand" : "text-graphite/75 hover:bg-soft",
                  )}
                  onClick={() => setTab(t)}
                >
                  {TAB_LABELS[t]}
                  {t === "draft" && draftCount > 0 ? (
                    <span className="rounded-full bg-brand px-1.5 text-[10px] font-bold text-white">{draftCount}</span>
                  ) : null}
                </button>
              ))}
            </div>
          </aside>

          <div>
            <h2 className="mb-3 text-lg font-bold text-graphite">המודעות שלי · {TAB_LABELS[tab]}</h2>

            {moderationDraftCount > 0 && tab !== "draft" ? (
              <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-right text-sm font-semibold text-red-800" role="status">
                {moderationDraftCount === 1
                  ? "יש מודעת טיוטה שדורשת עדכון לפני פרסום חוזר."
                  : `יש ${moderationDraftCount} מודעות טיוטה שדורשות עדכון לפני פרסום חוזר.`}{" "}
                <button type="button" className="font-bold text-brand underline" onClick={() => setTab("draft")}>
                  מעבר לטיוטות
                </button>
              </p>
            ) : null}

            {listLoading && rows.length === 0 ? <p className="py-6 text-sm text-graphite/60">טוען מודעות…</p> : null}
            {listError ? <p className="py-6 text-sm text-graphite/60">לא הצלחנו לטעון את המודעות. נסה שוב מאוחר יותר.</p> : null}
            {!listLoading && !listError && filtered.length === 0 ? (
              <div className="bubble-card py-10 text-center" style={{ borderRadius: 14 }}>
                <p className="text-sm text-graphite/60">אין מודעות בקטגוריה הזו.</p>
                <Link href="/publish" className="btn-puffy mt-4 inline-flex px-6 py-2.5 text-sm no-underline">
                  לפרסום מודעה חדשה
                </Link>
              </div>
            ) : null}

            <div className="space-y-2.5">
              {filtered.map((listing) => (
                <AccountListingRow key={listing.id} listing={listing} onChanged={() => void load()} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </PageMain>
  );
}
