"use client";

import { useCallback, useState, type CSSProperties, type MouseEvent } from "react";
import { BadgePercent, MapPin, Search, ShieldCheck, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type FeatureBanner = {
  id: string;
  title: string;
  description: string;
  mesh: string;
  glow: string;
  glowSoft: string;
  accent: string;
  iconColor: string;
  visual: "search" | "savings" | "shield";
  Icon: LucideIcon;
};

const FEATURE_BANNERS: FeatureBanner[] = [
  {
    id: "search",
    title: "חיפוש חכם",
    description: "סינון לפי אזור, מחיר, חדרים ומאפיינים — ישירות מהפיד.",
    visual: "search",
    accent: "text-brand",
    iconColor: "text-brand",
    Icon: Search,
    mesh: "radial-gradient(ellipse 100% 80% at 30% 0%, rgba(0,157,224,0.2) 0%, transparent 55%), radial-gradient(ellipse 90% 70% at 100% 80%, rgba(56,189,248,0.15) 0%, transparent 50%), linear-gradient(165deg, #e8f5fd 0%, #f8fafc 55%, #ffffff 100%)",
    glow: "rgba(0, 157, 224, 0.35)",
    glowSoft: "rgba(56, 189, 248, 0.28)",
  },
  {
    id: "savings",
    title: "חיסכון בעמלות",
    description: "לובי אינה מתווכת — חיבור ישיר למפרסם, בלי לשלם עמלות תיווך מיותרות.",
    visual: "savings",
    accent: "text-violet-600",
    iconColor: "text-violet-600",
    Icon: BadgePercent,
    mesh: "radial-gradient(ellipse 95% 75% at 70% 5%, rgba(139,92,246,0.22) 0%, transparent 52%), radial-gradient(ellipse 80% 60% at 0% 90%, rgba(167,139,250,0.12) 0%, transparent 48%), linear-gradient(160deg, #f3e8ff 0%, #faf5ff 50%, #ffffff 100%)",
    glow: "rgba(139, 92, 246, 0.32)",
    glowSoft: "rgba(167, 139, 250, 0.26)",
  },
  {
    id: "shield",
    title: "דיווח מהיר",
    description: "דיווח על עמלה, הונאה או פרטים שגויים — ללוח נקי ואמין.",
    visual: "shield",
    accent: "text-amber-700",
    iconColor: "text-amber-600",
    Icon: ShieldCheck,
    mesh: "radial-gradient(ellipse 100% 70% at 20% 0%, rgba(251,146,60,0.2) 0%, transparent 52%), radial-gradient(ellipse 85% 65% at 95% 75%, rgba(253,186,116,0.14) 0%, transparent 45%), linear-gradient(155deg, #fff7ed 0%, #fffbf5 52%, #ffffff 100%)",
    glow: "rgba(251, 146, 60, 0.32)",
    glowSoft: "rgba(253, 186, 116, 0.24)",
  },
];

function useParallax() {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const onMove = useCallback((e: MouseEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width - 0.5) * 10;
    const y = ((e.clientY - r.top) / r.height - 0.5) * 8;
    setOffset({ x, y });
  }, []);
  const onLeave = useCallback(() => setOffset({ x: 0, y: 0 }), []);
  return { offset, onMove, onLeave };
}

function SearchVisual({ banner, offset }: { banner: FeatureBanner; offset: { x: number; y: number } }) {
  const theme = { "--feature-glow": banner.glow, "--feature-glow-soft": banner.glowSoft } as CSSProperties;
  return (
    <div className="relative h-full w-full" style={theme}>
      <div
        className="feature-glass-blob feature-3d-float-a absolute end-[18%] top-[22%] h-8 w-11"
        style={{ transform: `translate(${offset.x * 0.4}px, ${offset.y * 0.3}px)` }}
        aria-hidden
      />
      <div
        className="feature-glass-blob feature-3d-float-b absolute start-[16%] top-[30%] h-5 w-5"
        style={{ transform: `translate(${offset.x * -0.5}px, ${offset.y * 0.6}px)` }}
        aria-hidden
      />
      <div
        className="absolute left-1/2 top-1/2"
        style={{ transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))` }}
      >
        <div className="feature-glass-lens feature-glass-shine relative grid h-[46px] w-[46px] place-items-center sm:h-[50px] sm:w-[50px]">
          <Search className={cn("h-5 w-5 sm:h-6 sm:w-6", banner.iconColor)} strokeWidth={2.2} aria-hidden />
          <div className="absolute end-0 top-0 grid h-5 w-5 place-items-center rounded-full border border-white bg-brand text-white shadow-[0_4px_14px_rgba(0,157,224,0.45)]">
            <MapPin className="h-2.5 w-2.5" aria-hidden />
          </div>
        </div>
      </div>
      <div
        className="absolute bottom-[18%] left-1/2 h-10 w-10 -translate-x-1/2 rounded-full opacity-70 blur-xl"
        style={{ background: banner.glowSoft }}
        aria-hidden
      />
    </div>
  );
}

function SavingsVisual({ banner, offset }: { banner: FeatureBanner; offset: { x: number; y: number } }) {
  const theme = { "--feature-glow": banner.glow, "--feature-glow-soft": banner.glowSoft } as CSSProperties;
  return (
    <div className="relative h-full w-full" style={theme}>
      <div
        className="feature-glass-blob feature-3d-float-a absolute start-[14%] top-[32%] h-6 w-10"
        style={{ transform: `translate(${offset.x * -0.4}px, ${offset.y * 0.5}px)` }}
        aria-hidden
      />
      <div
        className="absolute left-1/2 top-1/2"
        style={{ transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))` }}
      >
        <div className="feature-glass-lens feature-glass-shine grid h-[44px] w-[44px] place-items-center sm:h-[48px] sm:w-[48px]">
          <BadgePercent className={cn("h-5 w-5 sm:h-6 sm:w-6", banner.iconColor)} strokeWidth={2.2} aria-hidden />
        </div>
      </div>
    </div>
  );
}

function ShieldVisual({ banner, offset }: { banner: FeatureBanner; offset: { x: number; y: number } }) {
  const theme = { "--feature-glow": banner.glow, "--feature-glow-soft": banner.glowSoft } as CSSProperties;
  return (
    <div className="relative h-full w-full" style={theme}>
      <div
        className="feature-glass-blob feature-3d-float-a absolute end-[16%] top-[28%] h-7 w-7"
        style={{ transform: `translate(${offset.x * 0.3}px, ${offset.y * 0.4}px)` }}
        aria-hidden
      />
      <div
        className="absolute left-1/2 top-1/2"
        style={{ transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))` }}
      >
        <div className="feature-glass-lens feature-glass-shine grid h-[46px] w-[46px] place-items-center rounded-[44%] sm:h-[50px] sm:w-[50px]">
          <ShieldCheck className={cn("h-5 w-5 sm:h-6 sm:w-6", banner.iconColor)} strokeWidth={2.2} aria-hidden />
        </div>
      </div>
      <div
        className="feature-glass-panel absolute start-[14%] bottom-[24%] h-2 w-10 rounded-full feature-3d-float-b sm:w-11"
        style={{ transform: `translate(${offset.x * -0.3}px, 0)` }}
        aria-hidden
      />
    </div>
  );
}

function FeatureVisual({
  banner,
  offset,
}: {
  banner: FeatureBanner;
  offset: { x: number; y: number };
}) {
  if (banner.visual === "search") return <SearchVisual banner={banner} offset={offset} />;
  if (banner.visual === "savings") return <SavingsVisual banner={banner} offset={offset} />;
  return <ShieldVisual banner={banner} offset={offset} />;
}

function FeatureBannerCardPlain({ banner }: { banner: FeatureBanner }) {
  const Icon = banner.Icon;
  return (
    <article
      className="bubble-card min-w-0 rounded-[16px] p-4 shadow-bubble"
      aria-labelledby={`feature-banner-title-${banner.id}`}
      dir="rtl"
    >
      <div
        className={cn(
          "mb-3 grid size-10 place-items-center rounded-xl bg-soft",
          banner.iconColor,
        )}
      >
        <Icon className="size-5 shrink-0" aria-hidden />
      </div>
      <h3
        id={`feature-banner-title-${banner.id}`}
        className={cn("font-display text-[15px] font-extrabold leading-tight sm:text-base", banner.accent)}
      >
        {banner.title}
      </h3>
      <p className="mt-1.5 text-[11px] font-medium leading-[1.5] text-graphite/70 sm:text-xs">
        {banner.description}
      </p>
    </article>
  );
}

function FeatureBannerCard({ banner }: { banner: FeatureBanner }) {
  const { offset, onMove, onLeave } = useParallax();
  const themeStyle = {
    "--feature-glow": banner.glow,
    "--feature-glow-soft": banner.glowSoft,
  } as CSSProperties;

  return (
    <article
      className="feature-banner-card group relative min-w-0 overflow-hidden rounded-[20px] border border-white/90 p-1 shadow-bubble transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_40px_rgba(15,23,42,0.1)]"
      style={{ ...themeStyle, background: banner.mesh }}
      aria-labelledby={`feature-banner-title-${banner.id}`}
    >
      <div
        className="relative mx-auto h-[92px] max-w-full shrink-0 overflow-hidden rounded-[16px] px-2 sm:h-[98px] sm:px-2.5"
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        aria-hidden
      >
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full blur-2xl sm:h-[4.5rem] sm:w-[4.5rem]"
          style={{ background: banner.glowSoft }}
        />
        <FeatureVisual banner={banner} offset={offset} />
      </div>

      <div className="relative px-2 pb-1.5 pt-1 sm:px-2 sm:pb-2" dir="rtl">
        <div className="feature-glass-panel rounded-[12px] px-2.5 py-2 sm:rounded-[14px] sm:px-3 sm:py-2.5">
          <h3
            id={`feature-banner-title-${banner.id}`}
            className={cn(
              "font-display text-[15px] font-extrabold leading-[1.15] tracking-tight sm:text-[16px]",
              banner.accent,
            )}
          >
            {banner.title}
          </h3>
          <p className="mt-1.5 text-[11px] font-medium leading-[1.5] text-graphite/72 sm:text-[12px]">
            {banner.description}
          </p>
        </div>
      </div>
    </article>
  );
}

export function HomeFeatureBanners({
  className,
  embedded = false,
  gridLayout = "feed",
  plainCards = false,
}: {
  className?: string;
  /** בתוך גריד הפיד — אחרי 3 שורות מודעות */
  embedded?: boolean;
  /** `account` — עמודה אחת במסכים צרים (ליד סיידבר) */
  gridLayout?: "feed" | "account";
  /** כרטיסים לבנים בלי גרדיאנט/רקע צבעוני (אזור אישי) */
  plainCards?: boolean;
}) {
  return (
    <section
      className={cn(
        embedded ? "relative z-[1] w-full min-w-0" : "mx-auto max-w-[1280px] px-4 pb-12 pt-2 sm:px-6 sm:pb-14",
        className,
      )}
      aria-label="יתרונות לובי"
    >
      <div
        className={cn(
          "relative z-[1] grid min-w-0 gap-3 sm:gap-5",
          gridLayout === "account" ? "grid-cols-1 md:grid-cols-3" : "grid-cols-3",
        )}
      >
        {FEATURE_BANNERS.map((banner) =>
          plainCards ? (
            <FeatureBannerCardPlain key={banner.id} banner={banner} />
          ) : (
            <FeatureBannerCard key={banner.id} banner={banner} />
          ),
        )}
      </div>
    </section>
  );
}
