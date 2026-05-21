export function AdBanner({
  variant = "leaderboard",
  label = "מקום פרסום",
}: {
  variant?: "leaderboard" | "rectangle";
  label?: string;
}) {
  const isLb = variant === "leaderboard";
  return (
    <div
      className={`relative w-full ${isLb ? "h-[110px]" : "aspect-[3/4]"} rounded-[22px] bg-white/60 backdrop-blur border-2 border-dashed border-brand/40 grid place-items-center text-center shadow-float overflow-hidden`}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(0,194,232,0.10),transparent_60%)]" />
      <div className="relative">
        <div className="text-[11px] uppercase tracking-[0.2em] text-brand font-bold">Advertisement</div>
        <div className="mt-1 text-sm font-semibold text-graphite/70">{label} {isLb ? "· 728 × 90" : "· 300 × 400"}</div>
      </div>
    </div>
  );
}