"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { InquiriesListClient } from "./InquiriesListClient";
import { cn } from "@/lib/utils";

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
    <div className={"flex min-h-0 flex-1 flex-col"}>
      <main
        className={cn("grid min-h-0 flex-1 w-full grid-cols-1 bg-card min-[960px]:grid-cols-[minmax(300px,34%)_minmax(0,1fr)]")}
        aria-label="פניות תמיכה"
      >
        <aside className={cn("flex min-h-0 flex-col border-b border-border min-[960px]:border-b-0 min-[960px]:border-e", threadOpen && "max-[959px]:hidden")} aria-label="רשימת פניות">
          <InquiriesListClient activeInquiryId={activeInquiryId} />
        </aside>
        <section className={"flex min-h-0 flex-col flex-1 bg-card"}>{children}</section>
      </main>
    </div>
  );
}
