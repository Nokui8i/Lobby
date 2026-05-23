"use client";

import Link from "next/link";
import { ArrowRight, MessageSquare, Search, Send } from "lucide-react";
import type { ComponentProps, ReactNode, RefObject } from "react";
import { Skeleton } from "@/components/ui/skeleton";
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

export function ChatInboxHeader({
  title = "תיבת הודעות",
  searchValue,
  onSearchChange,
  showSearch = false,
}: {
  title?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  showSearch?: boolean;
}) {
  return (
    <div className="shrink-0 space-y-2 px-4 pt-3 pb-2">
      <h1 className="text-lg font-black leading-tight text-graphite">{title}</h1>
      {showSearch && searchValue != null && onSearchChange ? (
        <ChatInboxSearchField value={searchValue} onChange={onSearchChange} />
      ) : null}
    </div>
  );
}

function ChatInboxSearchField({
  value,
  onChange,
  placeholder = "חיפוש שיחות",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="flex h-11 items-center gap-2.5 rounded-xl border border-slate-300/90 bg-white px-3.5 shadow-sm transition-[border-color,box-shadow] focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/15">
      <Search className="size-4 shrink-0 text-graphite/55" aria-hidden />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        dir="rtl"
        aria-controls="chat-thread-list"
        className="min-w-0 flex-1 bg-transparent text-sm font-medium text-graphite outline-none placeholder:font-normal placeholder:text-graphite/50"
      />
    </div>
  );
}

/** @deprecated השתמשו ב־ChatInboxHeader עם showSearch */
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
    <div className="shrink-0 px-4 pb-2">
      <ChatInboxSearchField value={value} onChange={onChange} placeholder={placeholder} />
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
  menu,
}: {
  href: string;
  active: boolean;
  unread: number;
  title: string;
  preview?: string | null;
  meta?: string;
  timeLabel?: string;
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
          className="flex min-w-0 flex-1 flex-col gap-0.5 p-3 text-right"
          aria-current={active ? "page" : undefined}
        >
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
  listingHref,
  actions,
}: {
  backHref: string;
  title: string;
  subtitle?: string;
  /** קישור לעמוד המודעה — נפתח בלשונית חדשה */
  listingHref?: string;
  actions?: ReactNode;
}) {
  const titleNode = listingHref ? (
    <Link
      href={listingHref}
      target="_blank"
      rel="noopener noreferrer"
      className="truncate font-bold text-graphite transition hover:text-brand hover:underline"
      title="פתיחת המודעה בלשונית חדשה"
    >
      {title}
    </Link>
  ) : (
    <span className="truncate font-bold text-graphite">{title}</span>
  );

  return (
    <header className="flex h-20 shrink-0 items-center justify-between border-b border-slate-200/80 bg-white px-4 md:px-6">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Link
          href={backHref}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-graphite shadow-float transition hover:text-brand md:hidden"
          aria-label="חזרה לרשימת השיחות"
        >
          <ArrowRight className="h-5 w-5" />
        </Link>
        <div className="min-w-0 flex-1 text-right">
          <h2 className="min-w-0 truncate">{titleNode}</h2>
          {subtitle ? <p className="truncate text-xs text-graphite/60">{subtitle}</p> : null}
        </div>
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </header>
  );
}

/** עמודת שיחה — כל ההודעות באותו צד (סגנון Fiverr) */
const chatConversationColumnClass = "flex w-full flex-col";

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
      className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-white px-4 py-6 md:px-6"
    >
      <div className={cn(chatConversationColumnClass, "gap-8")}>{children}</div>
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

/** הודעה — אותו סגנון לכולם; ההפרדה רק בשם + ריווח (כמו Fiverr, בלי צבע לכל צד) */
export function ChatMessageBubble({
  senderName,
  children,
  timeLabel,
}: {
  mine?: boolean;
  senderName: string;
  children: ReactNode;
  timeLabel?: string;
  read?: boolean;
}) {
  return (
    <article className="w-full text-right">
      <div className="mb-1 flex flex-wrap items-baseline justify-start gap-x-2 gap-y-0.5">
        <span className="text-[15px] font-bold leading-snug text-graphite">{senderName}</span>
        {timeLabel ? (
          <span className="text-xs font-normal text-graphite/50 tabular-nums">{timeLabel}</span>
        ) : null}
      </div>
      <p className="text-[15px] font-medium leading-relaxed whitespace-pre-wrap text-graphite">{children}</p>
    </article>
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
    <footer className="shrink-0 border-t border-slate-200/80 bg-white px-4 py-3 md:px-6">
      {notice ? <p className="mb-2 text-[11px] leading-relaxed text-graphite/50">{notice}</p> : null}
      {error ? <p className="text-destructive mb-2 text-xs font-bold">{error}</p> : null}
      <div className="flex items-end gap-2">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={maxLength}
          placeholder={placeholder}
          disabled={disabled || sending}
          rows={1}
          dir="rtl"
          aria-label={placeholder}
          className="max-h-32 min-h-11 min-w-0 flex-1 resize-none rounded-lg border border-slate-300/90 bg-white px-4 py-2.5 text-[15px] leading-relaxed text-graphite shadow-sm outline-none transition placeholder:text-graphite/45 focus:border-brand focus:ring-2 focus:ring-brand/15 disabled:bg-soft disabled:opacity-60"
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
          className="btn-puffy grid h-11 w-11 shrink-0 place-items-center rounded-lg p-0 shadow-puffy disabled:opacity-45"
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

