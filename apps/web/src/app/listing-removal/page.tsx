import type { Metadata } from "next";
import Link from "next/link";
import { LegalShell } from "../components/LegalShell";

export const metadata: Metadata = {
  title: "הסרת מודעות | Lobby",
  description: "מחזור חיי מודעה, הסרה, חידוש והושכר בלובי.",
};

export default function ListingRemovalPage() {
  return (
    <LegalShell title="הסרת מודעות">
      <p>מודעה פעילה לתקופת פרסום מוגדרת. לאחר מכן היא מוסתרת מהציבור ונשמרת לאזור האישי לחלון חידוש.</p>
      <h2>מחיקה אוטומטית</h2>
      <p>
        אם לא חודשה במועד — הנתונים והמדיה של המודעה עשויים להימחק מהתשתית. אם סומנה כהושכרה — תוצג אזהרה על מדיניות
        החזרים, ולאחר אישור המודעה תימחק. פירוט מלא:{" "}
        <Link href="/refunds" className="font-semibold text-brand hover:underline">
          מדיניות ביטולים והחזרים
        </Link>
        .
      </p>
      <h2>הסרה על ידי ניהול</h2>
      <p>מודעות המפרות תנאים, חוק או שקיבלו דיווחים מהימנים — עשויות להוסר או להוסתר ללא התראה מוקדמת.</p>
    </LegalShell>
  );
}
