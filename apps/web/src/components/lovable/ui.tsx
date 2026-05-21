"use client";

import { Check, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export const lovInputCls =
  "h-12 w-full rounded-2xl bg-soft px-4 outline-none text-graphite placeholder:text-graphite/40 focus:bg-white focus:shadow-float transition";

export function ChatIconBtn({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <button
      type="button"
      className={cn(
        "grid h-10 w-10 place-items-center rounded-full bg-white text-graphite/70 shadow-float transition hover:text-brand",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function AvatarBubble({ name, className }: { name: string; className?: string }) {
  const initial = name.trim().charAt(0) || "?";
  return (
    <div
      className={cn(
        "grid h-12 w-12 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#1FD6F8] to-[#00A8CC] text-base font-bold text-white shadow-puffy",
        className,
      )}
    >
      {initial}
    </div>
  );
}

export function PublishStepper({
  steps,
  currentStep,
  compact = false,
  className,
}: {
  steps: { id: number; label: string; icon: LucideIcon }[];
  currentStep: number;
  compact?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn("bubble-card", compact ? "mb-4 p-2.5 sm:p-3" : "mb-6 p-4", className)}
      style={{ borderRadius: compact ? 18 : 24 }}
    >
      <div className="flex items-center justify-between gap-1 sm:gap-2">
        {steps.map((s, i) => {
          const Icon = s.icon;
          const done = currentStep > s.id;
          const active = currentStep === s.id;
          return (
            <div key={s.id} className="flex min-w-0 flex-1 items-center">
              <div className="flex shrink-0 flex-col items-center">
                <div
                  className={cn(
                    "grid place-items-center font-bold transition",
                    compact ? "h-9 w-9 rounded-xl" : "h-12 w-12 rounded-2xl",
                    active ? "btn-puffy" : done ? "bg-emerald-500 text-white shadow-puffy" : "bg-soft text-graphite/50",
                  )}
                >
                  {done ? (
                    <Check className={compact ? "h-4 w-4" : "h-5 w-5"} />
                  ) : (
                    <Icon className={compact ? "h-4 w-4" : "h-5 w-5"} />
                  )}
                </div>
                <span
                  className={cn(
                    "mt-1 text-center font-semibold leading-tight",
                    compact ? "text-[10px] sm:text-[11px]" : "text-xs",
                    active ? "text-brand" : "text-graphite/60",
                  )}
                >
                  {s.label}
                </span>
              </div>
              {i < steps.length - 1 ? (
                <div
                  className={cn(
                    "flex-1 rounded-full",
                    compact ? "mx-1 h-0.5" : "mx-2 h-1",
                    currentStep > s.id ? "bg-emerald-400" : "bg-soft",
                  )}
                />
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
