"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { MessageCircle, Plus, User } from "lucide-react";
import { ACCOUNT_MESSAGES_BASE_PATH, isAccountMessagesPath } from "@lobby/shared";
import { useLobbyAuth } from "@/contexts/LobbyAuthContext";
import { useChatInboxOptional } from "@/contexts/ChatInboxContext";
import { isFirebaseConfigured } from "@/lib/firebase/isConfigured";
import { bubble } from "@/components/bubble/styles";
import { cn } from "@/lib/utils";

const LOBBY_MARK = "LOBBY";
const TYPEWRITER_MS = 82;
const CURSOR_HIDE_DELAY_MS = 450;

/** LOBBY — אנימציית הקלדה עדינה (ללא שינוי ל־SR: aria-label על הקישור). */
function LobbyTypewriterWordmark({ className }: { className?: string }) {
  const [shown, setShown] = useState("");
  const [showCursor, setShowCursor] = useState(true);
  const hideCursorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(LOBBY_MARK);
      setShowCursor(false);
      return;
    }

    let i = 0;
    const intervalId = window.setInterval(() => {
      i += 1;
      setShown(LOBBY_MARK.slice(0, i));
      if (i >= LOBBY_MARK.length) {
        window.clearInterval(intervalId);
        hideCursorTimeoutRef.current = window.setTimeout(() => {
          setShowCursor(false);
        }, CURSOR_HIDE_DELAY_MS);
      }
    }, TYPEWRITER_MS);

    return () => {
      window.clearInterval(intervalId);
      if (hideCursorTimeoutRef.current) window.clearTimeout(hideCursorTimeoutRef.current);
    };
  }, []);

  return (
    <span
      dir="ltr"
      aria-hidden
      className={cn(
        "inline-flex min-w-[5.25ch] items-baseline text-[1.375rem] font-semibold leading-none tracking-tight text-graphite sm:min-w-[5.5ch] sm:text-[1.5rem]",
        className,
      )}
    >
      <span className="inline-block">{shown}</span>
      {showCursor ? (
        <span
          className="motion-safe:animate-pulse ms-0.5 inline-block h-[0.88em] w-px translate-y-[0.06em] bg-graphite/50"
          aria-hidden
        />
      ) : null}
    </span>
  );
}

function isImmersiveRoute(pathname: string) {
  return (
    isAccountMessagesPath(pathname) ||
    pathname === "/chat" ||
    pathname.startsWith("/chat/") ||
    pathname === "/support" ||
    pathname.startsWith("/support/")
  );
}

export function LobbyNavbar() {
  const pathname = usePathname() || "";
  const router = useRouter();
  const { user, loading, openAuthModal } = useLobbyAuth();
  const inbox = useChatInboxOptional();
  const immersive = isImmersiveRoute(pathname);
  const chatActive = isAccountMessagesPath(pathname) || pathname.startsWith("/chat");
  const accountActive = pathname === "/account" || pathname.startsWith("/account/");
  const unread = inbox?.totalUnread ?? 0;

  function handlePublish() {
    if (loading || !isFirebaseConfigured()) return;
    if (!user) {
      openAuthModal();
      return;
    }
    router.push("/publish");
  }

  const neutralIconBtn =
    "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-[1.5px] border-slate-200 bg-transparent text-graphite transition hover:border-slate-300 hover:bg-soft";
  const neutralPillBtn =
    "relative inline-flex h-10 min-h-10 shrink-0 items-center gap-2 rounded-full border-[1.5px] border-slate-200 bg-transparent px-3.5 text-[15px] font-medium text-graphite transition hover:border-slate-300 hover:bg-soft sm:px-4";

  const profileControl = user ? (
    <Link
      href="/account"
      className={cn(neutralIconBtn, accountActive && "border-slate-300 bg-soft")}
      aria-label="החשבון שלי"
      title="החשבון שלי"
    >
      <User className="h-[1.125rem] w-[1.125rem]" strokeWidth={2.25} />
    </Link>
  ) : (
    <button
      type="button"
      onClick={openAuthModal}
      className={cn(neutralPillBtn, "px-3.5 text-sm font-medium sm:px-4")}
      aria-label="התחברות"
    >
      התחברות
    </button>
  );

  const publishButton = (
    <button
      type="button"
      onClick={handlePublish}
      disabled={loading || !isFirebaseConfigured()}
      className={cn(
        bubble.btnOutlineBrand,
        "h-10 shrink-0 gap-2 px-4 text-[15px] font-medium sm:px-5",
      )}
    >
      <Plus className="h-[1.125rem] w-[1.125rem] shrink-0 stroke-[2.25]" aria-hidden />
      <span className="hidden sm:inline">פרסום מודעה</span>
    </button>
  );

  const chatLink = (
    <Link
      href={ACCOUNT_MESSAGES_BASE_PATH}
      className={cn(neutralPillBtn, chatActive && "border-slate-300 bg-soft")}
      aria-label="הצ׳אטים שלי"
    >
      <MessageCircle className="h-[1.125rem] w-[1.125rem] shrink-0" strokeWidth={2} />
      <span className="hidden lg:inline">הצ׳אטים שלי</span>
      {unread > 0 ? (
        <span className="absolute -top-0.5 -start-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#FF4D6D] px-1 text-[10px] font-semibold text-white">
          {unread > 99 ? "99+" : unread}
        </span>
      ) : null}
    </Link>
  );

  return (
    <header
      style={{ height: "var(--header-height)" }}
      className={cn(
        "sticky top-0 z-[100] w-full shrink-0 bg-white",
        immersive
          ? "border-b border-[var(--lobby-border)]"
          : "shadow-[0_2px_10px_rgba(15,23,42,0.08)]",
      )}
    >
      <div className="flex h-full min-h-0 w-full items-center justify-between gap-3 px-3 sm:gap-4 sm:px-5 lg:px-8">
        {/* ימין RTL: לוגו בלבד */}
        <div className="flex min-w-0 shrink-0 items-center">
          <Link
            href="/"
            className="group flex shrink-0 items-center gap-2.5"
            aria-label="לובי — מעבר לדף הבית"
          >
            <div
              className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 bg-soft text-base font-bold text-graphite"
              aria-hidden
            >
              L
            </div>
            <LobbyTypewriterWordmark />
          </Link>
        </div>

        {/* קצה השמאלי של המסך: פרסום | פרופיל | צ׳אט (סדר DOM ל-RTL: צ׳אט → פרופיל → פרסום) */}
        <div className="flex shrink-0 items-center gap-2">
          {chatLink}
          {profileControl}
          {publishButton}
        </div>
      </div>
    </header>
  );
}
