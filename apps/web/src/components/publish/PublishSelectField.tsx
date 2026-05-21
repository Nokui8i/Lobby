"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const triggerCls =
  "flex h-11 w-full items-center justify-between gap-2 rounded-xl border border-slate-200/80 bg-soft px-4 text-[15px] font-medium text-graphite outline-none transition focus:border-brand focus:bg-soft focus:ring-2 focus:ring-brand/15 disabled:cursor-not-allowed disabled:opacity-50";

export function PublishSelectField({
  id,
  label,
  required,
  value,
  onChange,
  options,
  placeholder = "בחרו",
  disabled = false,
}: {
  id: string;
  label: React.ReactNode;
  required?: boolean;
  value: string;
  onChange: (value: string) => void;
  options: { id: string; label: string }[];
  placeholder?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.id === value);

  return (
    <div className="flex flex-col gap-1.5 text-right">
      <label htmlFor={id} className="text-[13px] font-semibold text-graphite">
        {label}
        {required ? <span className="text-red-800"> *</span> : null}
      </label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            id={id}
            disabled={disabled}
            className={triggerCls}
            aria-haspopup="listbox"
            aria-expanded={open}
          >
            <span className={cn("min-w-0 flex-1 truncate text-right", !value && "text-graphite/40")}>
              {selected?.label ?? placeholder}
            </span>
            <ChevronDown className={cn("h-4 w-4 shrink-0 text-graphite/45 transition", open && "rotate-180")} />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          side="bottom"
          sideOffset={6}
          className="z-[200] w-[var(--radix-popover-trigger-width)] max-h-[min(240px,42vh)] overflow-y-auto rounded-xl border border-slate-200/90 bg-white p-1 shadow-[0_4px_16px_rgba(15,23,42,0.1),0_12px_32px_rgba(15,23,42,0.12)]"
        >
          <ul role="listbox" aria-labelledby={id} className="m-0 list-none p-0">
            {options.map((o) => {
              const isSelected = o.id === value;
              return (
                <li key={o.id} role="option" aria-selected={isSelected}>
                  <button
                    type="button"
                    className={cn(
                      "block w-full rounded-lg px-3 py-2.5 text-right text-[15px] font-medium transition",
                      isSelected ? "bg-brand/10 font-semibold text-brand" : "text-graphite hover:bg-soft",
                    )}
                    onClick={() => {
                      onChange(o.id);
                      setOpen(false);
                    }}
                  >
                    {o.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </PopoverContent>
      </Popover>
    </div>
  );
}
