import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type PageMainProps = {
  children: ReactNode;
  className?: string;
  flush?: boolean;
  fullBleed?: boolean;
};

/** מעטפת תוכן אחת — בלי container כפול. */
export function PageMain({ children, className, flush = false, fullBleed = false }: PageMainProps) {
  if (fullBleed) {
    return <main className={cn("flex min-h-0 min-w-0 flex-1 flex-col", className)}>{children}</main>;
  }

  return (
    <main className={cn("flex min-w-0 flex-1 flex-col", className)}>
      <div
        className={cn(
          "mx-auto w-full min-w-0 max-w-[1320px] px-4 sm:px-6",
          flush ? "py-2 pb-6 md:py-3" : "py-5 pb-10 md:py-6",
        )}
      >
        {children}
      </div>
    </main>
  );
}
