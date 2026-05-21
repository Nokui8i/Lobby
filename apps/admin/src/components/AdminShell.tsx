"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { isFirebaseConfigured } from "@/lib/firebase/isConfigured";
import { cn } from "@/lib/utils";
import { AdminSidebar } from "./AdminSidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isStaff, isLoading } = useAdminAuth();
  const isLoginRoute = pathname === "/login";
  const isInquiriesRoute = pathname.startsWith("/inquiries");

  useEffect(() => {
    if (isLoading || isLoginRoute) return;
    if (!isStaff) router.replace("/login");
  }, [isLoading, isStaff, isLoginRoute, router]);

  if (isLoginRoute) {
    return <>{children}</>;
  }

  if (!isFirebaseConfigured()) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-white p-6">
        <Card className="max-w-md">
          <CardContent className="space-y-2 pt-6 text-center">
            <h1 className="font-display text-xl font-semibold">חסר חיבור Firebase</h1>
            <p className="text-muted-foreground text-sm">
              העתיקו את משתני הסביבה מ־apps/web/.env.local ל־apps/admin/.env.local
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading || !isStaff) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-white p-6">
        <Skeleton className="size-10 rounded-full" />
        <p className="text-muted-foreground text-sm">{isLoading ? "טוען…" : "מפנה להתחברות…"}</p>
      </div>
    );
  }

  return (
    <div className="admin-surface min-h-dvh">
      <AdminSidebar />
      <main
        className={cn(
          "min-h-dvh ps-72",
          isInquiriesRoute ? "flex flex-col overflow-hidden" : "overflow-auto",
        )}
      >
        <div
          className={cn(
            isInquiriesRoute
              ? "flex min-h-0 flex-1 flex-col"
              : "mx-3 py-6 md:pe-2 md:py-8",
          )}
        >
          {children}
        </div>
      </main>
    </div>
  );
}

