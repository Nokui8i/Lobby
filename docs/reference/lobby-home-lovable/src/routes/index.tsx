import { createFileRoute, Link } from "@tanstack/react-router";
import { Search, MapPin, Home as HomeIcon, BedDouble, Wallet, Sparkles } from "lucide-react";
import { properties } from "@/data/properties";
import { PropertyCard } from "@/components/PropertyCard";
import { AdBanner } from "@/components/AdBanner";
import { Footer } from "@/components/Footer";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "LOBBY — מצא את הבית הבא שלך" },
      { name: "description", content: "שוק נדל״ן פרימיום בעיצוב 3D בועתי. דירות, בתים ופנטהאוזים." },
    ],
  }),
});

function Index() {
  const featured = properties.slice(0, 6);
  return (
    <div>
      {/* HERO */}
      <section className="relative pt-10 pb-14">
        <div className="mx-auto max-w-[1280px] px-6">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand/10 text-[11px] font-semibold text-brand mb-5">
              <Sparkles className="h-3 w-3" /> חדש · מעל 12,000 נכסים פעילים
            </div>
            <h1 className="text-4xl md:text-6xl font-black tracking-tight text-graphite leading-[1.05]">
              מצא את הבית הבא <br />שלך <span className="text-brand">בלמידה</span>
            </h1>
            <p className="mt-4 text-sm md:text-base text-graphite/60 max-w-xl mx-auto">
              חיפוש חכם, נקי ומדויק. הכל במקום אחד.
            </p>
          </div>

          {/* Floating search bubble */}
          <div className="mt-8 max-w-5xl mx-auto">
            <div className="bubble-card p-2 md:p-2.5" style={{ borderRadius: 16 }}>
              <div className="grid grid-cols-1 md:grid-cols-[1.4fr_1fr_0.8fr_1.2fr_auto] gap-2">
                <SearchField icon={<MapPin className="h-4 w-4" />} label="מיקום" placeholder="עיר, שכונה" />
                <SearchField icon={<HomeIcon className="h-4 w-4" />} label="סוג נכס" placeholder="דירה / בית / פנטהאוז" />
                <SearchField icon={<BedDouble className="h-4 w-4" />} label="חדרים" placeholder="3+" />
                <SearchField icon={<Wallet className="h-4 w-4" />} label="טווח מחירים" placeholder="עד 4,000,000" />
                <Link to="/listings" className="btn-puffy h-[52px] px-6 rounded-xl text-sm font-semibold inline-flex items-center justify-center gap-2">
                  <Search className="h-4 w-4" /> חפש
                </Link>
              </div>
            </div>
            {/* Quick chips */}
            <div className="mt-5 flex flex-wrap gap-1.5 justify-center">
              {["תל אביב", "הרצליה", "רמת גן", "ירושלים", "פנטהאוז", "עם מרפסת"].map((c) => (
                <span key={c} className="px-3 py-1.5 rounded-full bg-[#F8F9FA] border border-slate-100 text-xs text-graphite/75 hover:text-brand transition cursor-pointer">
                  {c}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Leaderboard Ad */}
      <div className="mx-auto max-w-[1280px] px-6">
        <AdBanner variant="leaderboard" label="באנר ראשי" />
      </div>

      {/* Listings */}
      <section className="mx-auto max-w-[1280px] px-6 mt-12">
        <div className="flex items-end justify-between mb-5">
          <div>
            <h2 className="text-2xl font-bold text-graphite">נכסים מומלצים</h2>
            <p className="text-xs text-slate-500 mt-1">נבחרו עבורך על בסיס פופולריות והעדפות אזוריות</p>
          </div>
          <Link to="/listings" className="hidden md:inline-flex h-9 px-4 rounded-full bg-[#F8F9FA] border border-slate-100 text-[13px] font-semibold text-graphite hover:bg-slate-100 transition">
            כל הנכסים ←
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_260px] gap-4">
          {featured.slice(0, 3).map((p) => <PropertyCard key={p.id} p={p} />)}
          <div className="hidden lg:block">
            <AdBanner variant="rectangle" label="פרסומת צד" />
          </div>
          {featured.slice(3).map((p) => <PropertyCard key={p.id} p={p} />)}
        </div>
      </section>

      {/* Value props */}
      <section className="mx-auto max-w-[1280px] px-6 mt-16">
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { t: "חיפוש חכם", d: "סינון מתקדם לפי מאות פרמטרים — חדרים, מרחק לים, ציון בית ספר.", e: "🔎" },
            { t: "צ׳אט מאובטח", d: "תקשורת ישירה עם המוכר ללא תיווך. תגובה ממוצעת תוך 3 דקות.", e: "💬" },
            { t: "אימות בעלי דירה", d: "כל מודעה עוברת בדיקה אוטומטית כדי להגן עליך מהונאות.", e: "🛡️" },
          ].map((f) => (
            <div key={f.t} className="bubble-card p-5" style={{ borderRadius: 16 }}>
              <div className="h-10 w-10 rounded-lg bg-brand/10 grid place-items-center text-xl">{f.e}</div>
              <h3 className="mt-4 text-base font-bold text-graphite">{f.t}</h3>
              <p className="mt-1.5 text-sm text-graphite/65 leading-relaxed">{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      <Footer />
    </div>
  );
}

function SearchField({
  icon, label, placeholder,
}: { icon: React.ReactNode; label: string; placeholder: string }) {
  return (
    <div className="h-[52px] px-4 rounded-xl bg-[#F8F9FA] hover:bg-slate-100 transition flex items-center gap-2.5 cursor-pointer">
      <div className="h-7 w-7 rounded-lg bg-brand/10 grid place-items-center text-brand [&>svg]:h-3.5 [&>svg]:w-3.5">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] font-semibold text-graphite/55 uppercase tracking-wide">{label}</div>
        <input
          className="w-full bg-transparent text-[13px] font-medium text-graphite placeholder:text-graphite/40 outline-none"
          placeholder={placeholder}
        />
      </div>
    </div>
  );
}
