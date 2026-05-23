import type { Metadata } from "next";
import { Suspense } from "react";
import { LegalShell } from "../components/LegalShell";
import { ContactPageClient } from "./ContactPageClient";

export const metadata: Metadata = {
  title: "יצירת קשר | Lobby",
  description: "פנייה לתמיכת Lobby / לובי.",
};

export default function ContactPage() {
  return (
    <LegalShell title="יצירת קשר" showFooterNote={false}>
      <p>נשמח לעזור בנושאי חשבון, תקלות טכניות ונגישות.</p>
      <h2>שליחת פנייה</h2>
      <p>
        מלאו את הטופס — תיפתח שיחה עם צוות התמיכה. אפשר לעקוב ולהמשיך לכתוב ב{" "}
        <a href="/account/messages">הודעות</a>.
      </p>
      <Suspense fallback={<p>טוען…</p>}>
        <ContactPageClient />
      </Suspense>
    </LegalShell>
  );
}
