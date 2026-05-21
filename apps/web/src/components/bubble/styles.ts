/** מחלקות Lovable — מוגדרות ב-globals.css (.glass, .btn-puffy, .bubble-card, …) */
export const bubble = {
  page: "bg-white",
  card: "bubble-card",
  cardPad: "bubble-card p-5 sm:p-6",
  glass: "glass",
  btnPrimary: "btn-puffy rounded-full px-6 py-3 text-sm font-semibold text-white disabled:opacity-50",
  btnOutlineBrand:
    "btn-outline-brand inline-flex items-center justify-center rounded-full px-5 py-2 text-[13px] font-semibold disabled:opacity-50",
  btnOutlineBrandIcon:
    "btn-outline-brand-icon inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full p-0",
  btnOutline:
    "inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-graphite shadow-sm hover:bg-soft",
  input:
    "h-12 w-full shrink-0 rounded-xl border border-slate-200 bg-soft px-4 text-sm font-semibold text-graphite outline-none placeholder:text-graphite/40 focus:border-brand focus:ring-2 focus:ring-brand/15",
  heading: "font-bold text-graphite",
  label: "text-sm font-semibold text-graphite",
  subtext: "text-sm font-medium text-graphite/60",
  badge: "shrink-0 rounded-full bg-soft px-2.5 py-0.5 text-[11px] font-medium text-graphite/70",
  badgeActive: "rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold text-brand",
  price: "text-[20px] font-extrabold text-graphite md:text-3xl text-brand",
  shadowCard: "shadow-bubble",
} as const;
