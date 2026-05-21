"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type MessagingWorkspaceProps = {
  mainAriaLabel: string;
  listAriaLabel: string;
  list: ReactNode;
  threadOpen: boolean;
  children: ReactNode;
};

/** צ׳אט Lovable — כרטיס אחד, inbox 340px */
export function MessagingWorkspace({
  mainAriaLabel,
  listAriaLabel,
  list,
  threadOpen,
  children,
}: MessagingWorkspaceProps) {
  return (
    <main className="flex h-full min-h-0 flex-1 flex-col overflow-hidden px-4 py-4" aria-label={mainAriaLabel}>
      <div
        className={cn(
          "bubble-card shadow-bubble flex h-full min-h-0 flex-1 overflow-hidden",
          threadOpen && "max-md:flex max-md:flex-col",
        )}
        style={{ borderRadius: 28 }}
      >
        <aside
          className={cn(
            "flex h-full w-full min-h-0 shrink-0 flex-col border-graphite/5 border-e bg-soft/30 md:w-[340px]",
            threadOpen && "max-md:hidden",
          )}
          aria-label={listAriaLabel}
        >
          {list}
        </aside>

        <section className={cn("flex min-h-0 min-w-0 flex-1 flex-col", !threadOpen && "max-md:hidden")}>
          {children}
        </section>
      </div>
    </main>
  );
}
