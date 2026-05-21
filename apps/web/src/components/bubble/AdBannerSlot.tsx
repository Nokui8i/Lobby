import { cn } from "@/lib/utils";

/** מקום פרסומת — מבוסס על Lovable AdBanner */
export function AdBannerSlot({
  variant = "leaderboard",
  label = "מקום פרסום",
  className,
}: {
  variant?: "leaderboard" | "rectangle";
  label?: string;
  className?: string;
}) {
  const isLb = variant === "leaderboard";
  return (
    <div
      className={cn(
        "relative grid w-full place-items-center overflow-hidden rounded-[22px] border-2 border-dashed border-brand/40 bg-white/60 text-center shadow-float backdrop-blur",
        isLb ? "h-[110px]" : "aspect-[3/4] min-h-[200px]",
        className,
      )}
      role="complementary"
      aria-label={label}
    >
      <div
        className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(0,157,224,0.1),transparent_60%)]"
        aria-hidden
      />
      <div className="relative">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-brand">Advertisement</p>
        <p className="mt-1 text-sm font-semibold text-graphite/70">
          {label} {isLb ? "· 728 × 90" : "· 300 × 400"}
        </p>
      </div>
    </div>
  );
}
