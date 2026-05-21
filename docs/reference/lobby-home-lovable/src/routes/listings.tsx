import { createFileRoute } from "@tanstack/react-router";
import { properties } from "@/data/properties";
import { PropertyCard } from "@/components/PropertyCard";
import { AdBanner } from "@/components/AdBanner";
import { Footer } from "@/components/Footer";
import { SlidersHorizontal, Search } from "lucide-react";

export const Route = createFileRoute("/listings")({
  component: Listings,
  head: () => ({
    meta: [
      { title: "כל הנכסים — LOBBY" },
      { name: "description", content: "עיין בכל הנכסים הזמינים." },
    ],
  }),
});

function Listings() {
  return (
    <div className="mx-auto max-w-[1280px] px-6 pt-8">
      <div className="bubble-card p-2 flex items-center gap-2" style={{ borderRadius: 14 }}>
        <div className="flex items-center gap-2 flex-1 px-3">
          <Search className="h-4 w-4 text-brand" />
          <input className="flex-1 h-10 bg-transparent outline-none text-sm text-graphite placeholder:text-graphite/40" placeholder="חיפוש לפי עיר, שכונה או מילת מפתח" />
        </div>
        <button className="h-10 px-4 rounded-lg bg-[#F8F9FA] text-graphite text-[13px] font-semibold inline-flex items-center gap-2 hover:bg-slate-100 transition">
          <SlidersHorizontal className="h-3.5 w-3.5" /> סינון
        </button>
        <button className="btn-puffy h-10 px-5 rounded-lg text-[13px] font-semibold">חפש</button>
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-5">
        <aside className="space-y-3">
          <div className="bubble-card p-4" style={{ borderRadius: 14 }}>
            <h3 className="text-sm font-bold text-graphite mb-3">סוג נכס</h3>
            <div className="space-y-1.5">
              {["דירה", "בית פרטי", "פנטהאוז", "סטודיו"].map((t) => (
                <label key={t} className="flex items-center gap-2.5 text-[13px] text-graphite/80 cursor-pointer">
                  <input type="checkbox" className="h-3.5 w-3.5 accent-brand" />
                  {t}
                </label>
              ))}
            </div>
          </div>
          <div className="bubble-card p-4" style={{ borderRadius: 14 }}>
            <h3 className="text-sm font-bold text-graphite mb-3">חדרים</h3>
            <div className="flex flex-wrap gap-1.5">
              {["1", "2", "3", "4", "5+"].map((r) => (
                <button key={r} className="h-8 w-10 rounded-full bg-[#F8F9FA] text-graphite/80 text-xs font-semibold hover:bg-brand hover:text-white transition">{r}</button>
              ))}
            </div>
          </div>
          <AdBanner variant="rectangle" label="פרסומת צד" />
        </aside>

        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-graphite/60 text-xs">{properties.length} נכסים נמצאו</p>
            <select className="h-9 px-3.5 rounded-full bg-[#F8F9FA] border border-slate-100 text-[13px] font-medium text-graphite outline-none">
              <option>מיון: רלוונטיות</option>
              <option>מחיר נמוך לגבוה</option>
              <option>מחיר גבוה לנמוך</option>
              <option>חדש ביותר</option>
            </select>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {properties.map((p) => <PropertyCard key={p.id} p={p} />)}
          </div>
          <div className="mt-6">
            <AdBanner variant="leaderboard" label="באנר אמצע פיד" />
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}