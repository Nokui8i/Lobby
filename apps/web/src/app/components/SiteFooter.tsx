import Link from "next/link";
import { bubble } from "@/components/bubble/styles";
import { cn } from "@/lib/utils";

const FOOTER_PLATFORM_LINKS = [
  { href: "/", label: "דף הבית" },
  { href: "/publish", label: "פרסום מודעה" },
  { href: "/account", label: "האזור האישי" },
  { href: "/saved", label: "שמורים" },
  { href: "/account/messages", label: "צ׳אט" },
] as const;

const FOOTER_LEGAL_LINKS = [
  { href: "/terms", label: "תקנון שימוש" },
  { href: "/refunds", label: "ביטולים והחזרים" },
  { href: "/privacy", label: "מדיניות פרטיות" },
  { href: "/accessibility", label: "נגישות" },
  { href: "/reporting-policy", label: "מדיניות דיווחים" },
  { href: "/listing-removal", label: "הסרת מודעות" },
] as const;

const FOOTER_HELP_LINKS = [
  { href: "/contact", label: "יצירת קשר" },
  { href: "/reporting-policy", label: "איך מדווחים?" },
] as const;

function FooterLinkGroup({
  title,
  links,
}: {
  title: string;
  links: readonly { href: string; label: string }[];
}) {
  return (
    <div>
      <h3 className="font-display mb-3 text-sm font-bold tracking-tight text-graphite">{title}</h3>
      <ul className="space-y-2.5">
        {links.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="text-sm font-medium text-graphite/65 transition-colors hover:text-brand"
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Footer משותף — אמון, חוק, ניווט (Lovable) */
export function SiteFooter({ compactTop = false }: { compactTop?: boolean }) {
  const year = new Date().getFullYear();

  return (
    <footer
      className={cn(
        "site-footer relative",
        compactTop ? "mt-0 border-t border-slate-200/90" : "mt-20 border-t border-slate-200/90",
      )}
      dir="rtl"
    >
      <div className="site-footer-glow pointer-events-none absolute inset-x-0 top-0 h-40" aria-hidden />

      <div className="relative mx-auto max-w-[1280px] px-4 pb-8 pt-12 sm:px-6 sm:pt-14 sm:pb-10">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-5">
            <Link href="/" className="group inline-flex items-center gap-3" aria-label="לובי — דף הבית">
              <div
                className="grid h-10 w-10 place-items-center rounded-xl bg-brand text-sm font-black text-white shadow-puffy transition-transform group-hover:scale-[1.02]"
                aria-hidden
              >
                L
              </div>
              <div className="text-right">
                <p className="font-display text-xl font-black tracking-tight text-graphite">לובי</p>
                <p className="text-xs font-semibold tracking-wide text-graphite/45">Lobby</p>
              </div>
            </Link>

            <p className="mt-5 max-w-md text-sm leading-relaxed text-graphite/70">
              <strong className="font-semibold text-graphite">לובי</strong> היא פלטפורמת לוח דירות להשכרה
              בישראל — חיפוש חכם, חיבור ישיר למפרסמים, ותקשורת נוחה בצ׳אט. מיועדת לשוכרים שרוצים לגלוש
              בלי דמי תיווך ולמפרסמים שרוצים להגיע לקהל רלוונטי.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/publish" className={cn(bubble.btnPrimary, "shadow-puffy")}>
                פרסום מודעה
              </Link>
              <Link href="/" className={bubble.btnOutline}>
                חיפוש דירות
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:col-span-7">
            <FooterLinkGroup title="ניווט" links={FOOTER_PLATFORM_LINKS} />
            <FooterLinkGroup title="משפטי ואמון" links={FOOTER_LEGAL_LINKS} />
            <FooterLinkGroup title="עזרה" links={FOOTER_HELP_LINKS} />
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-4 border-t border-slate-200/80 pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-center text-xs font-medium text-graphite/50 sm:text-start">
            © {year} Lobby / לובי · לוח פרסום ותקשורת — לא ייעוץ משפטי או תיווך.
          </p>
          <nav
            className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 sm:justify-end"
            aria-label="קישורים משפטיים"
          >
            {FOOTER_LEGAL_LINKS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-xs font-semibold text-graphite/55 transition-colors hover:text-brand"
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/contact"
              className="text-xs font-semibold text-graphite/55 transition-colors hover:text-brand"
            >
              יצירת קשר
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
