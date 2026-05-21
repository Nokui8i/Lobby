import { Link } from "@tanstack/react-router";
import { Heart, MapPin, BedDouble, Maximize2 } from "lucide-react";
import { formatPrice, type Property } from "@/data/properties";
import { useState } from "react";

export function PropertyCard({ p }: { p: Property }) {
  const [saved, setSaved] = useState(false);
  return (
    <Link
      to="/property/$id"
      params={{ id: p.id }}
      className="bubble-card group block overflow-hidden transition hover:border-slate-200"
      style={{ borderRadius: 16 }}
    >
      <div className="relative aspect-[16/11] w-full overflow-hidden">
        <img
          src={p.image}
          alt={p.title}
          loading="lazy"
          width={1280}
          height={896}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
        />
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); setSaved((s) => !s); }}
          className={`absolute top-2.5 left-2.5 h-8 w-8 rounded-full grid place-items-center transition ${
            saved ? "bg-[#FF4D6D] text-white" : "bg-white/90 text-graphite"
          } shadow-sm backdrop-blur`}
          aria-label="שמירה"
        >
          <Heart className={`h-3.5 w-3.5 ${saved ? "fill-current" : ""}`} />
        </button>
        <div className="absolute top-2.5 right-2.5 px-2.5 py-0.5 rounded-full bg-graphite/80 text-white text-[10px] font-semibold backdrop-blur">
          {p.type}
        </div>
      </div>
      <div className="p-4">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[20px] font-extrabold text-graphite leading-none">{formatPrice(p.price)}</span>
        </div>
        <h3 className="mt-1.5 text-sm font-semibold text-graphite line-clamp-1">{p.title}</h3>
        <div className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
          <MapPin className="h-3 w-3" />
          <span>{p.neighborhood}, {p.city}</span>
        </div>
        <div className="mt-2.5 flex items-center gap-3 text-xs text-graphite/70">
          <span className="flex items-center gap-1"><BedDouble className="h-3.5 w-3.5" />{p.rooms} חד׳</span>
          <span className="flex items-center gap-1"><Maximize2 className="h-3.5 w-3.5" />{p.size} מ״ר</span>
          <span>קומה {p.floor}</span>
        </div>
        <div className="mt-3 flex gap-1.5 overflow-x-auto no-scrollbar">
          {p.tags.map((t) => (
            <span key={t} className="flex-shrink-0 px-2.5 py-0.5 rounded-full bg-[#F8F9FA] text-graphite/70 text-[11px] font-medium">
              {t}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}