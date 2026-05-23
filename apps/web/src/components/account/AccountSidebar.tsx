"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Bell, Eye, Heart, LogOut, MessageCircle, Settings } from "lucide-react";
import { useChatInboxOptional } from "@/contexts/ChatInboxContext";
import { ACCOUNT_MESSAGES_BASE_PATH, SAVED_LISTINGS_TITLE_HE, isAccountMessagesPath } from "@lobby/shared";
import { useLobbyAuth } from "@/contexts/LobbyAuthContext";
import { fetchMyListingsFromFirestore } from "@/lib/firebase/listingQueries";
import { isFirebaseConfigured } from "@/lib/firebase/isConfigured";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type AccountNavActive = "account" | "messages" | "settings" | "notifications" | "saved";

type NavItem = {
  id: AccountNavActive;
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

const NAV_ITEMS: NavItem[] = [
  { id: "account", href: "/account", label: "המודעות שלי", icon: Eye },
  { id: "messages", href: ACCOUNT_MESSAGES_BASE_PATH, label: "תיבת הודעות", icon: MessageCircle },
  { id: "saved", href: "/saved", label: SAVED_LISTINGS_TITLE_HE, icon: Heart },
  { id: "notifications", href: "/account/notifications", label: "התראות", icon: Bell },
  { id: "settings", href: "/account/settings", label: "הגדרות חשבון", icon: Settings },
];

const LISTING_TAB_LABELS = {
  active: "פעילות בלוח",
  draft: "טיוטות",
  offFeed: "לא מוצגות",
} as const;

type ListingTab = keyof typeof LISTING_TAB_LABELS;

function isActive(pathname: string, href: string) {
  if (href === "/account") return pathname === "/account";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function navActiveFromPath(pathname: string): AccountNavActive {
  if (isAccountMessagesPath(pathname)) return "messages";
  if (pathname.startsWith("/account/settings")) return "settings";
  if (pathname.startsWith("/account/notifications")) return "notifications";
  if (pathname === "/saved" || pathname.startsWith("/saved/")) return "saved";
  return "account";
}

export function AccountSidebar({ notifUnread = 0 }: { notifUnread?: number }) {
  const pathname = usePathname() || "";
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, signOutUser, displayNameForUi } = useLobbyAuth();
  const chatInbox = useChatInboxOptional();
  const chatUnread = chatInbox?.totalUnread ?? 0;
  const active = navActiveFromPath(pathname);
  const onAccountHome = pathname === "/account";
  const [activeCount, setActiveCount] = useState(0);
  const [draftCount, setDraftCount] = useState(0);

  const displayName = displayNameForUi.trim() || user?.email?.split("@")[0] || "משתמש";
  const initial = displayName.charAt(0) || "?";

  useEffect(() => {
    if (!user || !isFirebaseConfigured()) {
      setActiveCount(0);
      setDraftCount(0);
      return;
    }
    let cancelled = false;
    void fetchMyListingsFromFirestore(user.uid)
      .then((rows) => {
        if (cancelled) return;
        setActiveCount(rows.filter((l) => l.status === "active" || l.status === "pending_review").length);
        setDraftCount(rows.filter((l) => l.status === "draft").length);
      })
      .catch(() => {
        if (!cancelled) {
          setActiveCount(0);
          setDraftCount(0);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const listingTab: ListingTab =
    searchParams.get("tab") === "draft"
      ? "draft"
      : searchParams.get("tab") === "offFeed"
        ? "offFeed"
        : "active";

  function setListingTab(tab: ListingTab) {
    const params = new URLSearchParams(searchParams.toString());
    if (tab === "active") params.delete("tab");
    else params.set("tab", tab);
    const q = params.toString();
    router.replace(q ? `/account?${q}` : "/account");
  }

  if (!user) return null;

  return (
    <aside
      className="sticky top-[var(--header-height)] z-20 flex h-[calc(100dvh-var(--header-height))] w-72 shrink-0 flex-col bg-white shadow-bubble"
      aria-label="ניווט אזור אישי"
    >
      <div className="border-b border-border px-5 py-5">
        <div className="flex items-center gap-3">
          <div
            className="grid size-12 shrink-0 place-items-center rounded-full bg-brand text-lg font-bold text-white"
            aria-hidden
          >
            {initial}
          </div>
          <div className="min-w-0 flex-1 text-right">
            <p className="font-display truncate text-base font-semibold leading-tight text-graphite">{displayName}</p>
            <p className="text-muted-foreground mt-0.5 truncate text-xs">{user.email ?? ""}</p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
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

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4">
        {NAV_ITEMS.map((item) => {
          const itemActive = active === item.id;
          const Icon = item.icon;
          return (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                "flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors no-underline",
                itemActive
                  ? "bg-brand/10 text-primary"
                  : "text-muted-foreground hover:bg-soft hover:text-foreground",
              )}
              aria-current={itemActive ? "page" : undefined}
            >
              <span className="flex items-center gap-2.5">
                <Icon className="size-4 shrink-0 opacity-80" />
                {item.label}
              </span>
              {item.id === "notifications" && notifUnread > 0 ? (
                <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-white">
                  {notifUnread > 99 ? "99+" : notifUnread}
                </span>
              ) : null}
              {item.id === "messages" && chatUnread > 0 ? (
                <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-white">
                  {chatUnread > 99 ? "99+" : chatUnread}
                </span>
              ) : null}
            </Link>
          );
        })}

        {onAccountHome ? (
          <div className="mt-4 border-t border-border pt-4">
            <p className="text-muted-foreground mb-2 px-3 text-xs font-semibold">סטטוס מודעות</p>
            {(Object.keys(LISTING_TAB_LABELS) as ListingTab[]).map((t) => (
              <button
                key={t}
                type="button"
                className={cn(
                  "flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
                  listingTab === t
                    ? "bg-brand/10 text-primary"
                    : "text-muted-foreground hover:bg-soft hover:text-foreground",
                )}
                onClick={() => setListingTab(t)}
              >
                {LISTING_TAB_LABELS[t]}
              </button>
            ))}
          </div>
        ) : null}
      </nav>

      <div className="border-t border-border p-4">
        <Button
          type="button"
          variant="outline"
          className="text-destructive w-full border-destructive/20 hover:bg-destructive/5"
          onClick={() => void signOutUser()}
        >
          <LogOut className="size-4" />
          התנתקות
        </Button>
      </div>
    </aside>
  );
}
