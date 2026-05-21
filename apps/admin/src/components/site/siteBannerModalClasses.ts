import { cn } from "@/lib/utils";
import { ap } from "@/lib/admin-page-classes";

const panelBase =
  "relative w-full max-h-[min(90dvh,720px)] overflow-y-auto rounded-2xl border-2 border-slate-300 bg-white p-4 shadow-[0_24px_64px_rgba(15,23,42,0.35)] ring-1 ring-slate-200/90 sm:p-5";

function isSquareBannerAspect(aspectRatio: number): boolean {
  return aspectRatio > 0.95 && aspectRatio < 1.05;
}

/** מודלי באנר — מסגרת וניגודיות ברורים */
export const siteBannerModal = {
  overlay:
    "fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/55 p-3 backdrop-blur-[3px] sm:p-4",
  panel: cn(panelBase, "max-w-[min(96vw,640px)] sm:max-w-[680px]"),
  headerRow: "mb-1 flex items-start justify-between gap-4",
  title: "min-w-0 flex-1 font-display text-lg font-bold leading-snug text-foreground",
  closeBtn:
    "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-foreground disabled:pointer-events-none disabled:opacity-50",
  subtitle: "mt-1 text-xs font-medium text-slate-600",
  previewFrame: "overflow-hidden rounded-xl border-2 border-slate-300 bg-slate-100 shadow-inner",
  sectionDivider: "mt-4 border-t-2 border-slate-300 pt-4",
  actionsRow: "mt-4 flex flex-wrap items-center justify-start gap-2.5 border-t-2 border-slate-300 pt-4",
  linkInput: cn(
    ap.searchInput,
    "w-full border-2 border-slate-300 bg-white text-sm font-medium shadow-none focus:border-primary focus:ring-2 focus:ring-primary/20",
  ),
  cancelBtn: cn(ap.modalCancelBtn, "min-h-10 border-2 border-slate-300 px-5 text-sm"),
  confirmBtn: cn(
    ap.modalConfirmBtn,
    "inline-flex min-h-10 min-w-[7.5rem] items-center justify-center gap-1.5 px-5 text-sm",
  ),
} as const;

/** חלון מודל — צר יותר לבאנר ריבועי (פרסום חיצוני) */
export function siteBannerModalPanelClass(aspectRatio: number): string {
  if (isSquareBannerAspect(aspectRatio)) {
    return cn(panelBase, "max-w-[min(96vw,400px)] sm:max-w-[420px]");
  }
  return siteBannerModal.panel;
}

/** תצוגה מקדימה בתוך המודל — מוגבלת לרוחב כמו באתר */
export function siteBannerModalPreviewClass(aspectRatio: number): string {
  if (isSquareBannerAspect(aspectRatio)) {
    return cn(siteBannerModal.previewFrame, "mx-auto w-full max-w-[280px] sm:max-w-[300px]");
  }
  return cn(siteBannerModal.previewFrame, "mx-auto w-full max-w-[520px]");
}
