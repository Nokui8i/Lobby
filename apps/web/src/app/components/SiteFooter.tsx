import Link from "next/link";

const footerLinks: { href: string; label: string }[] = [
  { href: "/terms", label: "תקנון" },
  { href: "/privacy", label: "פרטיות" },
  { href: "/accessibility", label: "נגישות" },
  { href: "/reporting-policy", label: "דיווחים" },
  { href: "/contact", label: "צור קשר" },
];

/** Footer — עיצוב Lovable */
export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-white/60 bg-white/50 backdrop-blur">
      <div className="mx-auto flex max-w-[1400px] flex-col items-center justify-between gap-4 px-6 py-10 text-sm text-graphite/70 md:flex-row">
        <div className="flex items-center gap-2">
          <div className="grid h-7 w-7 place-items-center rounded-lg bg-brand text-xs font-black text-white shadow-puffy">
            L
          </div>
          <span className="font-bold text-graphite">LOBBY</span>
          <span>© {new Date().getFullYear()}</span>
        </div>
        <nav className="flex flex-wrap justify-center gap-6">
          {footerLinks.map((item) => (
            <Link key={item.href} href={item.href} className="transition hover:text-brand">
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
