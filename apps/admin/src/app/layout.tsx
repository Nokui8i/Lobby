import type { Metadata } from "next";
import { Heebo, Inter } from "next/font/google";
import { AdminAuthProvider } from "@/contexts/AdminAuthContext";
import { AdminShell } from "@/components/AdminShell";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  variable: "--font-inter-next",
  display: "swap",
});

const heebo = Heebo({
  subsets: ["hebrew", "latin"],
  variable: "--font-heebo-next",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Lobby — ניהול",
  description: "ממשק ניהול פנימי ללובי",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl" suppressHydrationWarning>
      <body className={`${inter.variable} ${heebo.variable} antialiased`}>
        <AdminAuthProvider>
          <AdminShell>{children}</AdminShell>
        </AdminAuthProvider>
      </body>
    </html>
  );
}
