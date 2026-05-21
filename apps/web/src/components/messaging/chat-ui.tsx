"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, Building2, Check, CheckCheck, Headphones, MessageSquare, Search, Send } from "lucide-react";
import type { ComponentProps, ReactNode, RefObject } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { AvatarBubble } from "@/components/lovable/ui";
import { isComposerSendKey } from "@lobby/shared";
import { cn } from "@/lib/utils";

export function ChatPanelShell({
  children,
  className,
  ...props
}: ComponentProps<"div"> & { children: ReactNode }) {
  return (
    <div
      className={cn("flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-white/40", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function ChatInboxHeader({ title = "תיבת הודעות" }: { title?: string }) {
  return (
    <div className="shrink-0 p-4">
      <h1 className="mb-3 text-xl font-black text-graphite">{title}</h1>
    </div>
  );
}

export function ChatInboxSearch({
  value,
  onChange,
  placeholder = "חיפוש שיחות",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="shrink-0 px-4 pb-3">
      <div className="flex h-11 items-center gap-2 rounded-full bg-white px-4 shadow-float">
        <Search className="h-4 w-4 shrink-0 text-graphite/50" />
        <input
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          dir="rtl"
          aria-controls="chat-thread-list"
          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-graphite/40"
        />
      </div>
    </div>
  );
}

export function ChatInboxScroll({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain px-2 pb-3">{children}</div>
  );
}

export function ChatInboxSkeleton() {
  return (
    <ul className="flex flex-col gap-2 p-2" aria-hidden>
      {Array.from({ length: 6 }).map((_, i) => (
        <li key={i} className="flex gap-3 rounded-2xl p-3">
          <Skeleton className="size-12 shrink-0 rounded-full bg-soft" />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-3/5 rounded-lg bg-soft" />
            <Skeleton className="h-3 w-full rounded-lg bg-soft" />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function ChatThreadListItem({
  href,
  active,
  unread,
  title,
  preview,
  meta,
  timeLabel,
  icon: Icon = Building2,
  menu,
}: {
  href: string;
  active: boolean;
  unread: number;
  title: string;
  preview?: string | null;
  meta?: string;
  timeLabel?: string;
  icon?: LucideIcon;
  menu: ReactNode;
}) {
  return (
    <li>
      <div
        className={cn(
          "flex items-stretch gap-0 rounded-2xl transition",
          active ? "bg-white shadow-float" : "hover:bg-white/60",
        )}
      >
        <Link
          href={href}
          className="flex min-w-0 flex-1 items-center gap-3 p-3 text-right"
          aria-current={active ? "page" : undefined}
        >
          <div className="relative shrink-0">
            {meta || title ? (
              <AvatarBubble name={title} className="h-12 w-12 text-base" />
            ) : (
              <span className="grid h-12 w-12 place-items-center rounded-full bg-brand/15 text-brand">
                <Icon className="h-5 w-5" aria-hidden />
              </span>
            )}
          </div>
          <span className="min-w-0 flex-1">
            <span className="mb-0.5 flex items-center justify-between gap-2">
              <span className={cn("truncate text-sm", unread > 0 ? "font-bold text-graphite" : "font-semibold text-graphite")}>
                {title}
              </span>
              {timeLabel ? (
                <span className="shrink-0 text-[11px] text-graphite/50 tabular-nums">{timeLabel}</span>
              ) : null}
            </span>
            {meta ? <span className="truncate text-xs text-brand/80">{meta}</span> : null}
            <span className="mt-0.5 flex items-center justify-between gap-2">
              {preview ? <span className="truncate text-sm text-graphite/60">{preview}</span> : <span />}
              {unread > 0 ? (
                <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-brand px-1.5 text-[11px] font-bold text-white">
                  {unread > 99 ? "99+" : unread}
                </span>
              ) : null}
            </span>
          </span>
        </Link>
        <span className="flex shrink-0 items-center pe-1">{menu}</span>
      </div>
    </li>
  );
}

export function ChatInboxEmpty() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-full bg-brand/10 text-brand">
        <MessageSquare className="h-7 w-7" strokeWidth={1.5} />
      </span>
      <p className="text-sm font-bold text-graphite">אין שיחות עדיין</p>
      <p className="max-w-[16rem] text-xs leading-relaxed text-graphite/60">
        שלחו הודעה מעמוד מודעה כדי להתחיל שיחה סביב הדירה.
      </p>
    </div>
  );
}

export function ChatThreadHeader({
  backHref,
  title,
  subtitle,
  actions,
}: {
  backHref: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="flex h-20 shrink-0 items-center justify-between border-b border-graphite/5 bg-white/60 px-4 backdrop-blur md:px-6">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Link
          href={backHref}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-graphite shadow-float transition hover:text-brand md:hidden"
          aria-label="חזרה לרשימת השיחות"
        >
          <ArrowRight className="h-5 w-5" />
        </Link>
        <AvatarBubble name={title} />
        <div className="min-w-0 text-right">
          <h2 className="truncate font-bold text-graphite">{title}</h2>
          {subtitle ? <p className="truncate text-xs text-graphite/60">{subtitle}</p> : null}
        </div>
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </header>
  );
}

export function ChatMessageArea({
  scrollRef,
  children,
}: {
  scrollRef?: RefObject<HTMLDivElement | null>;
  children: ReactNode;
}) {
  return (
    <div
      ref={scrollRef}
      className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-white/50 px-4 py-6 md:px-6"
    >
      <div className="flex flex-col gap-3">{children}</div>
    </div>
  );
}

export function ChatSystemMessage({ children }: { children: ReactNode }) {
  return (
    <div className="flex w-full justify-center py-1" role="status">
      <p className="max-w-md rounded-full bg-white px-4 py-2 text-center text-xs font-medium text-graphite/60 shadow-float">
        {children}
      </p>
    </div>
  );
}

export function ChatMessageBubble({
  mine,
  children,
  timeLabel,
  read,
}: {
  mine: boolean;
  children: ReactNode;
  timeLabel?: string;
  read?: boolean;
}) {
  return (
    <div className={cn("flex w-full", mine ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[70%] px-4 py-3 text-sm leading-relaxed shadow-float",
          mine ? "btn-puffy rounded-[22px_22px_6px_22px]" : "rounded-[22px_22px_22px_6px] bg-white text-graphite",
        )}
      >
        <p>{children}</p>
        {timeLabel ? (
          <div
            className={cn(
              "mt-1 flex items-center justify-end gap-1 text-[10px]",
              mine ? "text-white/80" : "text-graphite/40",
            )}
          >
            {timeLabel}
            {mine ? (read ? <CheckCheck className="h-3 w-3" /> : <Check className="h-3 w-3" />) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function ChatComposer({
  value,
  onChange,
  onSend,
  sending,
  disabled,
  maxLength,
  error,
  notice,
  placeholder = "כתבו הודעה…",
}: {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  sending: boolean;
  disabled?: boolean;
  maxLength: number;
  error?: string | null;
  notice?: string;
  placeholder?: string;
}) {
  return (
    <footer className="shrink-0 border-t border-graphite/5 bg-white/80 px-4 py-4 backdrop-blur md:px-6">
      {notice ? <p className="mb-2 text-[11px] leading-relaxed text-graphite/50">{notice}</p> : null}
      {error ? <p className="text-destructive mb-2 text-xs font-bold">{error}</p> : null}
      <div className="flex items-end gap-2 rounded-full bg-soft p-2 shadow-float">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={maxLength}
          placeholder={placeholder}
          disabled={disabled || sending}
          rows={1}
          dir="rtl"
          className="max-h-32 min-h-11 min-w-0 flex-1 resize-none rounded-2xl border-0 bg-transparent px-3 py-2.5 text-sm font-medium leading-relaxed text-graphite outline-none placeholder:text-graphite/40"
          onKeyDown={(e) => {
            if (e.nativeEvent.isComposing) return;
            if (isComposerSendKey(e.key, e.shiftKey)) {
              e.preventDefault();
              onSend();
            }
          }}
        />
        <button
          type="button"
          disabled={disabled || sending || !value.trim()}
          onClick={onSend}
          aria-label="שליחה"
          className="btn-puffy grid h-12 w-12 shrink-0 place-items-center rounded-full p-0"
        >
          <Send className="h-5 w-5" />
        </button>
      </div>
    </footer>
  );
}

export function ChatEmptyThread() {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <span className="bubble-card grid h-16 w-16 place-items-center p-0 shadow-float">
        <MessageSquare className="h-8 w-8 text-brand" strokeWidth={1.25} />
      </span>
      <div className="max-w-sm space-y-1">
        <h2 className="text-lg font-bold text-graphite">המשיכו מהיכן שהפסקתם</h2>
        <p className="text-sm text-graphite/60">בחרו שיחה מהרשימה כדי לפתוח את הצ׳אט סביב המודעה.</p>
      </div>
    </div>
  );
}

export function ChatGate({
  children,
  loading,
  needsAuth,
  onAuth,
  firebaseMissing,
  message,
}: {
  children: ReactNode;
  loading?: boolean;
  needsAuth?: boolean;
  onAuth?: () => void;
  firebaseMissing?: boolean;
  message?: string;
}) {
  if (firebaseMissing) {
    return (
      <ChatPanelShell className="items-center justify-center gap-3 p-8 text-center">
        <p className="text-sm text-graphite/60">אין חיבור ל־Firebase.</p>
        <Link href="/" className="btn-puffy inline-flex px-6 py-2.5 text-sm">
          דף הבית
        </Link>
      </ChatPanelShell>
    );
  }

  if (loading) {
    return (
      <ChatPanelShell className="items-center justify-center p-8">
        <p className="text-sm text-graphite/60">טוען…</p>
      </ChatPanelShell>
    );
  }

  if (needsAuth) {
    return (
      <ChatPanelShell className="items-center justify-center gap-4 p-8 text-center">
        <p className="text-sm font-medium text-graphite">{message ?? "כדי לראות ולשלוח הודעות צריך להתחבר."}</p>
        <button type="button" className="btn-puffy px-8 py-3 text-sm" onClick={onAuth}>
          כניסה / הרשמה
        </button>
      </ChatPanelShell>
    );
  }

  return <>{children}</>;
}

export function ChatStatusBanner({ variant, children }: { variant: "error" | "muted"; children: ReactNode }) {
  return (
    <p
      className={cn(
        "mx-3 my-2 rounded-xl px-3 py-2 text-xs font-semibold",
        variant === "error" ? "bg-red-50 text-red-600" : "bg-soft text-graphite/70",
      )}
    >
      {children}
    </p>
  );
}

export function ChatThreadList({ children }: { children: ReactNode }) {
  return (
    <ul id="chat-thread-list" className="flex flex-col">
      {children}
    </ul>
  );
}

export { Headphones };
