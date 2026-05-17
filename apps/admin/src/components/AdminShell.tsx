"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { isFirebaseConfigured } from "@/lib/firebase/isConfigured";
import { AdminSidebar } from "./AdminSidebar";
import styles from "./AdminShell.module.css";

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isStaff, isLoading } = useAdminAuth();
  const isLoginRoute = pathname === "/login";

  useEffect(() => {
    if (isLoading || isLoginRoute) {
      return;
    }
    if (!isStaff) {
      router.replace("/login");
    }
  }, [isLoading, isStaff, isLoginRoute, router]);

  if (isLoginRoute) {
    return <>{children}</>;
  }

  if (!isFirebaseConfigured()) {
    return (
      <div className={styles.centered}>
        <div className={styles.card}>
          <h1>חסר חיבור Firebase</h1>
          <p>העתיקו את משתני הסביבה מ־apps/web/.env.local ל־apps/admin/.env.local</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={styles.centered}>
        <div className={styles.spinner} aria-hidden="true" />
        <p>טוען…</p>
      </div>
    );
  }

  if (!isStaff) {
    return (
      <div className={styles.centered}>
        <div className={styles.spinner} aria-hidden="true" />
        <p>מפנה להתחברות…</p>
      </div>
    );
  }

  return (
    <div className={styles.shell}>
      <AdminSidebar />
      <main className={styles.main}>{children}</main>
    </div>
  );
}
