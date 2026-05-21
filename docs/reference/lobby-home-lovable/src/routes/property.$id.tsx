import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { properties, formatPrice, type Property } from "@/data/properties";
import { Footer } from "@/components/Footer";
import { Heart, MapPin, BedDouble, Maximize2, Building2, Phone, MessageSquare, Share2, Star } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/property/$id")({
  component: PropertyPage,
  loader: ({ params }) => {
    const p = properties.find((x) => x.id === params.id);
    if (!p) throw notFound();
    return p;
  },
  head: ({ loaderData }) => ({
    meta: loaderData ? [
      { title: `${loaderData.title} — LOBBY` },
      { name: "description", content: loaderData.description },
      { property: "og:image", content: loaderData.image },
    ] : [],
  }),
});

function PropertyPage() {
  const p = Route.useLoaderData() as Property;
  const [active, setActive] = useState(0);
  return (
    <div className="mx-auto max-w-[1400px] px-6 pt-8">
      <nav className="text-sm text-graphite/60 mb-4">
        <Link to="/" className="hover:text-brand">בית</Link> ›{" "}
        <Link to="/listings" className="hover:text-brand">נכסים</Link> ›{" "}
        <span className="text-graphite">{p.city}</span>
      </nav>

      {/* Gallery */}
      <div className="bubble-card overflow-hidden shadow-bubble" style={{ borderRadius: 28 }}>
        <div className="relative aspect-[16/8] w-full overflow-hidden">
          <img src={p.gallery[active]} alt={p.title} className="h-full w-full object-cover" />
          <button className="absolute top-4 left-4 h-12 w-12 rounded-full bg-white/90 shadow-float grid place-items-center text-graphite hover:text-[#FF4D6D] transition">
            <Heart className="h-5 w-5" />
          </button>
          <button className="absolute top-4 left-20 h-12 w-12 rounded-full bg-white/90 shadow-float grid place-items-center text-graphite hover:text-brand transition">
            <Share2 className="h-5 w-5" />
          </button>
        </div>
        <div className="p-3 flex gap-2 overflow-x-auto">
          {p.gallery.map((g, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={`flex-shrink-0 h-20 w-28 rounded-2xl overflow-hidden border-2 transition ${
                active === i ? "border-brand shadow-puffy" : "border-transparent opacity-70"
              }`}
            >
              <img src={g} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8">
        <div>
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white shadow-float text-xs font-semibold text-graphite/70">{p.type}</div>
              <h1 className="mt-3 text-3xl md:text-4xl font-black text-graphite">{p.title}</h1>
              <p className="mt-2 flex items-center gap-1.5 text-graphite/70"><MapPin className="h-4 w-4" />{p.neighborhood}, {p.city}</p>
            </div>
            <div className="text-left">
              <div className="text-5xl font-black text-brand leading-none">{formatPrice(p.price)}</div>
              <div className="text-sm text-graphite/60 mt-1">≈ {formatPrice(Math.round(p.price / p.size))} למ״ר</div>
            </div>
          </div>

          {/* Stats bubbles */}
          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat icon={<BedDouble />} label="חדרים" value={`${p.rooms}`} />
            <Stat icon={<Maximize2 />} label="גודל" value={`${p.size} מ״ר`} />
            <Stat icon={<Building2 />} label="קומה" value={p.floor} />
            <Stat icon={<Star />} label="ציון אזור" value="9.2" />
          </div>

          <div className="mt-8 bubble-card p-7" style={{ borderRadius: 24 }}>
            <h2 className="text-xl font-bold text-graphite mb-3">תיאור הנכס</h2>
            <p className="text-graphite/80 leading-relaxed">{p.description}</p>
            <div className="mt-6 flex flex-wrap gap-2">
              {p.tags.map((t) => (
                <span key={t} className="px-4 py-2 rounded-full bg-secondary text-graphite/80 text-sm font-medium">{t}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Sticky CTA */}
        <aside className="lg:sticky lg:top-28 self-start space-y-4">
          <div className="bubble-card p-6 shadow-bubble" style={{ borderRadius: 24 }}>
            <div className="flex items-center gap-3">
              <div className="h-14 w-14 rounded-full bg-gradient-to-br from-[#1FD6F8] to-[#00A8CC] shadow-puffy text-white grid place-items-center text-xl font-black">
                {p.seller.name[0]}
              </div>
              <div>
                <div className="font-bold text-graphite">{p.seller.name}</div>
                <div className="text-xs text-graphite/60 flex items-center gap-1"><Star className="h-3 w-3 fill-current text-amber-400" />{p.seller.rating} · חבר משנת {p.seller.since}</div>
              </div>
            </div>

            <Link to="/chat" className="mt-5 btn-puffy h-14 rounded-2xl w-full font-bold text-base inline-flex items-center justify-center gap-2">
              <MessageSquare className="h-5 w-5" /> שלח הודעה למוכר
            </Link>
            <button className="mt-3 h-12 w-full rounded-2xl bg-white border border-graphite/10 font-semibold text-graphite inline-flex items-center justify-center gap-2 hover:-translate-y-0.5 transition shadow-float">
              <Phone className="h-4 w-4" /> הצג מספר טלפון
            </button>
          </div>
        </aside>
      </div>
      <Footer />
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bubble-card p-4 flex items-center gap-3" style={{ borderRadius: 20 }}>
      <div className="h-10 w-10 rounded-xl btn-puffy grid place-items-center text-white">{icon}</div>
      <div>
        <div className="text-xs text-graphite/60">{label}</div>
        <div className="font-bold text-graphite">{value}</div>
      </div>
    </div>
  );
}