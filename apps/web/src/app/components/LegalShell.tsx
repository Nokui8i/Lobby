import Link from "next/link";
import type { ReactNode } from "react";
import styles from "./LegalShell.module.css";

export function LegalShell({
  title,
  children,
  showFooterNote = true,
}: {
  title: string;
  children: ReactNode;
  showFooterNote?: boolean;
}) {
  return (
    <main className={styles.main}>
      <Link href="/" className={styles.back}>
        חזרה ללובי
      </Link>
      <article className={styles.article}>
        <h1>{title}</h1>
        {children}
        {showFooterNote ? (
          <p className={styles.muted}>עמוד זה מסכם את עקרונות השימוש ב־Lobby. אין בו ייעוץ משפטי אישי.</p>
        ) : null}
      </article>
    </main>
  );
}
