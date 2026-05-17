import Link from "next/link";
import styles from "./SiteFooter.module.css";

const footerLinks: { href: string; label: string }[] = [
  { href: "/terms", label: "תקנון שימוש" },
  { href: "/privacy", label: "מדיניות פרטיות" },
  { href: "/accessibility", label: "הצהרת נגישות" },
  { href: "/reporting-policy", label: "מדיניות דיווחים" },
  { href: "/listing-removal", label: "הסרת מודעות" },
  { href: "/contact", label: "יצירת קשר" },
];

export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.brand}>
          <strong>LOBBY</strong>
          <p>
            לובי היא פלטפורמת פרסום ותקשורת למציאת דירות להשכרה ישירות מול
            מפרסמים, עם דגש על אפס דמי תיווך לשוכר.
          </p>
        </div>

        <div className={styles.columns}>
          <section>
            <h2>הבהרה חשובה</h2>
            <p>
              Lobby אינה מתווך, אינה צד לעסקה, אינה מייצגת שוכר או משכיר, אינה
              מנהלת משא ומתן ואינה גובה משוכרים דמי תיווך, דמי הצלחה או אחוזים.
            </p>
          </section>

          <section>
            <h2>דיווח ובטיחות</h2>
            <p>
              אם ביקשו ממך עמלה, תשלום צדדי, פרטי תשלום חשודים, או שהמודעה נראית
              מזויפת/לא מדויקת, צריך לדווח דרך כפתור הדיווח בעמוד המודעה.
            </p>
          </section>

          <section>
            <h2>תנאים ומידע</h2>
            <nav className={styles.links} aria-label="קישורי מידע משפטי">
              {footerLinks.map((item) => (
                <Link key={item.href} href={item.href} className={styles.linkPill}>
                  {item.label}
                </Link>
              ))}
            </nav>
          </section>
        </div>

        <p className={styles.finePrint}>
          המידע במודעות נמסר על ידי המפרסמים ובאחריותם. לפני חתימה או תשלום יש
          לבדוק את פרטי הדירה, זהות המפרסם ותנאי ההתקשרות. © 2026 Lobby.
        </p>
      </div>
    </footer>
  );
}
