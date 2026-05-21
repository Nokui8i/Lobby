import Link from "next/link";
import type { ReactNode } from "react";
import { PageMain } from "@/components/layout/PageMain";

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
    <PageMain>
      <Link href="/" className="mb-6 inline-block text-sm font-semibold text-brand hover:underline">
        חזרה ללובי
      </Link>
      <article className="bubble-card max-w-none p-6 sm:p-8">
        <h1 className="font-display mb-6 text-3xl font-black tracking-tight text-graphite">{title}</h1>
        <div className="space-y-4 text-sm leading-relaxed text-graphite/80">{children}</div>
        {showFooterNote ? (
          <p className="mt-8 text-sm text-graphite/50">
            עמוד זה מסכם את עקרונות השימוש ב־Lobby. אין בו ייעוץ משפטי אישי.
          </p>
        ) : null}
      </article>
    </PageMain>
  );
}
