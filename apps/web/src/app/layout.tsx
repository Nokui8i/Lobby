import type { Metadata } from "next";
import { DM_Sans, Heebo, Inter } from "next/font/google";
import { AppShell } from "@/components/layout/AppShell";
import { Providers } from "@/components/Providers";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin", "latin-ext"],
  variable: "--font-dm-sans-next",
  display: "swap",
});

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
  title: {
    default: "Lobby | לובי - דירות להשכרה ללא דמי תיווך",
    template: "%s | Lobby",
  },
  description: "לוח דירות להשכרה בישראל עם צ׳אט, סינון חכם ואפס דמי תיווך לשוכרים.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl" suppressHydrationWarning>
      <body className={`${dmSans.variable} ${inter.variable} ${heebo.variable} antialiased`}>
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
