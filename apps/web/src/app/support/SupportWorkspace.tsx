"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { MessagingWorkspace } from "@/components/messaging/MessagingWorkspace";
import { SupportListClient } from "./SupportListClient";

function inquiryIdFromPath(pathname: string): string | null {
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] !== "support" || parts.length < 2) {
    return null;
  }
  return parts[1] ?? null;
}

export function SupportWorkspace({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "";
  const activeInquiryId = inquiryIdFromPath(pathname);
  const threadOpen = Boolean(activeInquiryId);

  return (
    <MessagingWorkspace
      mainAriaLabel="פניות לתמיכה"
      listAriaLabel="רשימת פניות"
      threadOpen={threadOpen}
      list={<SupportListClient activeInquiryId={activeInquiryId} />}
    >
      {children}
    </MessagingWorkspace>
  );
}
