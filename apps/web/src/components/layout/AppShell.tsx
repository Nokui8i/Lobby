"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { isAccountMessagesPath } from "@lobby/shared";
import { LobbyNavbar } from "@/components/layout/LobbyNavbar";
import { SiteFooter } from "@/app/components/SiteFooter";
import { cn } from "@/lib/utils";

function isImmersiveRoute(pathname: string) {
  return (
    isAccountMessagesPath(pathname) ||
    pathname === "/chat" ||
    pathname.startsWith("/chat/") ||
    pathname === "/support" ||
    pathname.startsWith("/support/")
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "";
  const immersive = isImmersiveRoute(pathname);
  const accountProfilePage = pathname === "/account";

  return (
    <div
      className={cn(
        "flex min-w-0 flex-col",
        immersive ? "h-dvh max-h-dvh overflow-hidden" : "min-h-dvh",
      )}
    >
      <LobbyNavbar />
      <div className={cn("flex min-h-0 min-w-0 flex-1 flex-col", immersive && "overflow-hidden")}>
        {children}
      </div>
      {!immersive ? <SiteFooter compactTop={accountProfilePage} /> : null}
    </div>
  );
}
