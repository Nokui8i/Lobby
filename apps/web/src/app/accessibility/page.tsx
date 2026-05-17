import type { Metadata } from "next";
import { LegalShell } from "../components/LegalShell";

export const metadata: Metadata = {
  title: "הצהרת נגישות | Lobby",
  description: "מחויבות Lobby לנגישות דיגיטלית וערוצי פנייה.",
};

export default function AccessibilityPage() {
  return (
    <LegalShell title="הצהרת נגישות">
      <p>
        אנו פועלים לשפר את נגישות האתר והאפליקציה למשתמשים עם מגוון צרכים, כולל תמיכה ב־RTL, ניגודיות, מיקוד מקלדת
        ותוויות לרכיבים אינטראקטיביים.
      </p>
      <h2>סטנדרטים</h2>
      <p>המטרה היא התאמה לעקרונות WCAG 2.1 ברמת AA ככל הניתן בתוך מגבלות המוצר והטכנולוגיה.</p>
      <h2>נתקלתם בבעיה?</h2>
      <p>אם מצאתם רכיב שאינו נגיש או שקשה להשתמש בו — כתבו לנו דרך עמוד יצירת הקשר, ונבדוק ונשפר.</p>
    </LegalShell>
  );
}
