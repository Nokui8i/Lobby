import type { Metadata } from "next";
import { LegalShell } from "../components/LegalShell";

export const metadata: Metadata = {
  title: "יצירת קשר | Lobby",
  description: "יצירת קשר עם Lobby / לובי.",
};

export default function ContactPage() {
  return (
    <LegalShell title="יצירת קשר">
      <p>נשמח לעזור בנושאי חשבון, תקלות טכניות, נגישות ובטיחות.</p>
      <h2>ערוץ ראשי</h2>
      <p>
        כתבו לנו לאימייל התמיכה של המוצר (יוגדר כשיהיה זמין בסביבת הייצור). בינתיים ניתן להשאיר פנייה דרך מנהלי
        הפרויקט או דרך ערוצי הפיתוח הפנימיים.
      </p>
      <h2>דחיפות ובטיחות</h2>
      <p>אם מדובר בחשד להונאה פעילה או בסיכון מיידי — ציינו זאת בכותרת הפנייה וצרפו קישור למודעה אם רלוונטי.</p>
    </LegalShell>
  );
}
