"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { InquiriesListClient } from "./InquiriesListClient";
import ws from "./inquiriesWorkspace.module.css";

function inquiryIdFromPath(pathname: string): string | null {
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] !== "inquiries" || parts.length < 2) {
    return null;
  }
  return parts[1] ?? null;
}

export function InquiriesWorkspace({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "";
  const activeInquiryId = inquiryIdFromPath(pathname);
  const threadOpen = Boolean(activeInquiryId);

  return (
    <div className={ws.fill}>
      <main
        className={`${ws.root} ${threadOpen ? ws.threadOpen : ""}`}
        aria-label="פניות תמיכה"
      >
        <aside className={ws.listPane} aria-label="רשימת פניות">
          <InquiriesListClient activeInquiryId={activeInquiryId} />
        </aside>
        <section className={ws.threadPane}>{children}</section>
      </main>
    </div>
  );
}
