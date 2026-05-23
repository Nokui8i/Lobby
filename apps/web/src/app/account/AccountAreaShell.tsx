"use client";

import type { ReactNode } from "react";
import { ListingSidebarBannersSection } from "@/components/listing/ListingSidebarBannersSection";
import { cn } from "@/lib/utils";

export function AccountAreaShell({
  title,
  children,
  showBanner = false,
  className,
}: {
  title: string;
  children: ReactNode;
  showBanner?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <h1 className="font-display mb-4 text-2xl font-semibold tracking-tight text-graphite md:text-3xl">{title}</h1>
      <div
        className={cn(
          "gap-5",
          showBanner ? "grid items-start lg:grid-cols-[minmax(0,1fr)_318px]" : undefined,
        )}
      >
        <div className="min-w-0">{children}</div>
        {showBanner ? (
          <aside className="mx-auto hidden w-full max-w-[318px] lg:sticky lg:top-[calc(var(--header-height)+1.5rem)] lg:mx-0 lg:block">
            <ListingSidebarBannersSection className="mt-0" />
          </aside>
        ) : null}
      </div>
    </div>
  );
}
