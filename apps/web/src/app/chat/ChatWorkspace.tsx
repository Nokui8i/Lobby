"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { ChatListClient } from "./ChatListClient";
import ws from "./chatWorkspace.module.css";

function threadIdFromPath(pathname: string): string | null {
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] !== "chat" || parts.length < 2) {
    return null;
  }
  return parts[1] ?? null;
}

export function ChatWorkspace({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "";
  const activeThreadId = threadIdFromPath(pathname);
  const threadOpen = Boolean(activeThreadId);

  return (
    <main
      className={`${ws.root} ${threadOpen ? ws.threadOpen : ""}`}
      aria-label="הודעות"
    >
      <aside className={ws.listPane} aria-label="רשימת שיחות">
        <ChatListClient activeThreadId={activeThreadId} />
      </aside>
      <section className={ws.threadPane}>{children}</section>
    </main>
  );
}
