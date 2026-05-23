"use client";

import { usePathname } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { useLobbyAuth } from "@/contexts/LobbyAuthContext";
import { useLobbyNotificationsOptional } from "@/contexts/LobbyNotificationsContext";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { HomeFeatureBanners } from "@/components/home/HomeFeatureBanners";
import { AccountSidebar } from "./AccountSidebar";

function isAccountShellRoute(pathname: string) {
  return (
    pathname === "/account" ||
    pathname.startsWith("/account/") ||
    pathname === "/saved" ||
    pathname.startsWith("/saved/")
  );
}

function isMessagingShellRoute(pathname: string) {
  return pathname === "/account/messages" || pathname.startsWith("/account/messages/");
}

function AccountShellInner({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "";
  const { user, loading } = useLobbyAuth();
  const notifCtx = useLobbyNotificationsOptional();
  const inShell = isAccountShellRoute(pathname);
  const messagingShell = isMessagingShellRoute(pathname);
  const showSidebar = Boolean(user) && inShell;
  const showAccountFeatureBanners = showSidebar && pathname === "/account";

  if (!inShell) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="flex min-h-[40dvh] flex-col items-center justify-center gap-4">
        <Skeleton className="size-10 rounded-full" />
        <p className="text-muted-foreground text-sm">טוען…</p>
      </div>
    );
  }

  if (!showSidebar) {
    return <div className="mx-auto w-full min-w-0 max-w-[1320px] px-4 py-5 md:py-6">{children}</div>;
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-row overflow-x-hidden bg-white">
      <AccountSidebar notifUnread={notifCtx?.unreadCount ?? 0} />
      <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden">
        <div
          className={cn(
            "w-full min-w-0 flex-1",
            messagingShell
              ? "flex min-h-0 flex-col overflow-hidden px-2 py-2 md:px-3 md:py-3"
              : cn(
                  "mx-auto max-w-[1280px] px-4 md:pe-2",
                  showAccountFeatureBanners ? "pt-6 pb-10 md:pt-8 md:pb-12" : "py-6 md:py-8",
                ),
          )}
        >
          {children}
        </div>
        {showAccountFeatureBanners ? (
          <div className="mx-auto w-full min-w-0 max-w-[1280px] shrink-0 px-4 pb-10 md:pe-2 md:pb-12">
            <HomeFeatureBanners embedded className="pb-0" gridLayout="account" plainCards />
          </div>
        ) : null}
      </main>
    </div>
  );
}

export function AccountShell({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className={cn("flex min-h-[40dvh] flex-col items-center justify-center gap-4")}>
          <Skeleton className="size-10 rounded-full" />
        </div>
      }
    >
      <AccountShellInner>{children}</AccountShellInner>
    </Suspense>
  );
}
