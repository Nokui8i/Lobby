"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { SupportListClient } from "./SupportListClient";
import ws from "../chat/chatWorkspace.module.css";

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
    <main
      className={`${ws.root} ${threadOpen ? ws.threadOpen : ""}`}
      aria-label="פניות לתמיכה"
    >
      <aside className={ws.listPane} aria-label="רשימת פניות">
        <SupportListClient activeInquiryId={activeInquiryId} />
      </aside>
      <section className={ws.threadPane}>{children}</section>
    </main>
  );
}
