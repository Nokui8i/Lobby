"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { parseMessagesThreadIdFromPath } from "@lobby/shared";
import { MessagingWorkspace } from "@/components/messaging/MessagingWorkspace";
import { ChatListClient } from "./ChatListClient";

export function ChatWorkspace({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "";
  const activeThreadId = parseMessagesThreadIdFromPath(pathname);
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
