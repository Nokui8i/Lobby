"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { MessagingWorkspace } from "@/components/messaging/MessagingWorkspace";
import { ChatListClient } from "./ChatListClient";

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
    <MessagingWorkspace
      mainAriaLabel="הודעות"
      listAriaLabel="רשימת שיחות"
      threadOpen={threadOpen}
      list={<ChatListClient activeThreadId={activeThreadId} />}
    >
      {children}
    </MessagingWorkspace>
  );
}
