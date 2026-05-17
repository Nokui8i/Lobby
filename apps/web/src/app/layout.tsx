import type { Metadata } from "next";
import { Providers } from "@/components/Providers";
import { SiteFooter } from "./components/SiteFooter";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lobby | לובי - דירות להשכרה ללא דמי תיווך",
  description: "לוח דירות להשכרה בישראל עם צ׳אט, סינון חכם ואפס דמי תיווך לשוכרים.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl">
      <body>
        <Providers>
          {children}
          <SiteFooter />
        </Providers>
      </body>
    </html>
  );
}
