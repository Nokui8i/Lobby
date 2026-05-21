import { createFileRoute, Link } from "@tanstack/react-router";
import { Footer } from "@/components/Footer";
import { properties, formatPrice } from "@/data/properties";
import { Bell, Heart, Settings, LogOut, Eye, MessageSquare, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/account")({
  component: Account,
  head: () => ({ meta: [{ title: "החשבון שלי — LOBBY" }] }),
});

function Account() {
  const myListings = properties.slice(0, 3);
  return (
    <div className="mx-auto max-w-[1280px] px-6 pt-8">
      {/* Profile hero */}
      <div className="bubble-card p-5 flex flex-col md:flex-row items-center gap-5" style={{ borderRadius: 16 }}>
        <div className="h-16 w-16 rounded-full bg-brand grid place-items-center text-white text-xl font-black">
          ר
        </div>
        <div className="flex-1 text-center md:text-right">
          <h1 className="text-xl font-bold text-graphite">רותם בן-דוד</h1>
          <p className="text-xs text-slate-500 mt-0.5">חבר/ה מאז 2023 · תל אביב</p>
          <div className="mt-2 flex gap-1.5 justify-center md:justify-start">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-semibold">מאומת ✓</span>
            <span className="px-2.5 py-0.5 rounded-full bg-[#F8F9FA] text-graphite/70 text-[11px] font-medium">3 מודעות פעילות</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Link to="/publish" className="btn-puffy h-10 px-5 rounded-full text-[13px] font-semibold">פרסם מודעה</Link>
          <button className="h-10 w-10 rounded-full bg-[#F8F9FA] border border-slate-100 grid place-items-center"><Settings className="h-4 w-4 text-graphite/60" /></button>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: <Eye />, label: "צפיות במודעות", value: "2,847" },
          { icon: <MessageSquare />, label: "הודעות חדשות", value: "12" },
          { icon: <Heart />, label: "נשמרו על ידך", value: "24" },
          { icon: <TrendingUp />, label: "פניות השבוע", value: "+38%" },
        ].map((s) => (
          <div key={s.label} className="bubble-card p-4" style={{ borderRadius: 14 }}>
            <div className="h-8 w-8 rounded-lg bg-brand/10 text-brand grid place-items-center [&>svg]:h-4 [&>svg]:w-4">{s.icon}</div>
            <div className="mt-3 text-xl font-bold text-graphite">{s.value}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Layout */}
      <div className="mt-6 grid lg:grid-cols-[240px_1fr] gap-5">
        <aside className="bubble-card p-3 h-fit" style={{ borderRadius: 14 }}>
          {[
            { icon: <Eye className="h-4 w-4" />, label: "המודעות שלי", active: true },
            { icon: <Heart className="h-4 w-4" />, label: "מועדפים" },
            { icon: <Bell className="h-4 w-4" />, label: "התראות" },
            { icon: <Settings className="h-4 w-4" />, label: "הגדרות חשבון" },
            { icon: <LogOut className="h-4 w-4" />, label: "התנתקות" },
          ].map((it) => (
            <button key={it.label} className={`w-full text-right flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition ${it.active ? "bg-brand/10 text-brand" : "text-graphite/75 hover:bg-[#F8F9FA]"}`}>
              {it.icon}{it.label}
            </button>
          ))}
        </aside>

        <div>
          <h2 className="text-lg font-bold text-graphite mb-3">המודעות שלי</h2>
          <div className="space-y-2.5">
            {myListings.map((p) => (
              <div key={p.id} className="bubble-card p-3 flex flex-col md:flex-row gap-3 items-center" style={{ borderRadius: 14 }}>
                <div className="h-20 w-28 flex-shrink-0 rounded-lg overflow-hidden">
                  <img src={p.image} alt={p.title} className="h-full w-full object-cover" />
                </div>
                <div className="flex-1 min-w-0 text-center md:text-right">
                  <h3 className="text-sm font-semibold text-graphite truncate">{p.title}</h3>
                  <p className="text-xs text-slate-500">{p.neighborhood}, {p.city}</p>
                  <div className="mt-1.5 flex gap-3 text-xs text-graphite/70 justify-center md:justify-start">
                    <span><b>{p.rooms}</b> חדרים</span>
                    <span><b>{p.size}</b> מ״ר</span>
                    <span className="text-graphite font-bold">{formatPrice(p.price)}</span>
                  </div>
                </div>
                <div className="flex gap-2 items-center">
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-semibold">פעיל</span>
                  <Link to="/property/$id" params={{ id: p.id }} className="h-8 px-3.5 rounded-full bg-[#F8F9FA] border border-slate-100 text-xs font-semibold inline-flex items-center">צפייה</Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}