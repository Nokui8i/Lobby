import type { Metadata } from "next";
import { AdminAuthProvider } from "@/contexts/AdminAuthContext";
import { AdminShell } from "@/components/AdminShell";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lobby — ניהול",
  description: "ממשק ניהול פנימי ללובי",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <body>
        <AdminAuthProvider>
          <AdminShell>{children}</AdminShell>
        </AdminAuthProvider>
      </body>
    </html>
  );
}
