"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { LobbyNavbar } from "@/components/layout/LobbyNavbar";
import { SiteFooter } from "@/app/components/SiteFooter";
import { cn } from "@/lib/utils";

function isImmersiveRoute(pathname: string) {
  return pathname === "/chat" || pathname.startsWith("/chat/") || pathname === "/support" || pathname.startsWith("/support/");
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "";
  const immersive = isImmersiveRoute(pathname);

  return (
    <div className={cn("flex flex-col", immersive ? "h-dvh max-h-dvh overflow-hidden" : "min-h-dvh")}>
      <LobbyNavbar />
      <div className={cn("flex min-h-0 flex-1 flex-col", immersive && "overflow-hidden")}>{children}</div>
      {!immersive ? <SiteFooter /> : null}
    </div>
  );
}
