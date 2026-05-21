import { Link, useLocation } from "@tanstack/react-router";
import { MessageCircle, User, Plus } from "lucide-react";

const navLinks = [
  { to: "/", label: "בית" },
  { to: "/listings", label: "חיפוש נכסים" },
  { to: "/account", label: "החשבון שלי" },
];

export function Header() {
  const loc = useLocation();
  return (
    <header className="h-16 flex-shrink-0 sticky top-0 z-50 glass">
      <div className="mx-auto h-full max-w-[1400px] px-6 flex items-center justify-between gap-6">
        {/* Left: profile + chats */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <Link
            to="/account"
            className="h-10 w-10 rounded-full bg-brand flex items-center justify-center text-white"
            aria-label="פרופיל"
          >
            <User className="h-4 w-4" />
          </Link>
          <Link
            to="/chat"
            className={`h-10 px-4 rounded-full flex items-center gap-2 text-[13px] font-semibold transition ${
              loc.pathname.startsWith("/chat")
                ? "btn-puffy"
                : "bg-[#F8F9FA] text-graphite hover:bg-slate-100"
            }`}
          >
            <MessageCircle className="h-3.5 w-3.5" />
            הצ׳אטים שלי
            <span className="h-4 min-w-4 px-1.5 rounded-full bg-[#FF4D6D] text-white text-[10px] flex items-center justify-center">3</span>
          </Link>
        </div>

        {/* Center: nav */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              activeOptions={{ exact: l.to === "/" }}
              className="px-3.5 py-1.5 rounded-full text-[13px] font-medium text-graphite/70 hover:text-graphite hover:bg-[#F8F9FA] transition data-[status=active]:bg-[#F8F9FA] data-[status=active]:text-graphite"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        {/* Right: logo + publish */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="h-8 w-8 rounded-lg bg-brand grid place-items-center text-white font-black text-base">L</div>
            <span className="text-xl font-black tracking-tight text-graphite">LOBBY</span>
          </Link>
          <Link
            to="/publish"
            className="btn-puffy h-10 px-5 rounded-full text-[13px] font-semibold inline-flex items-center gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            פרסום מודעה
          </Link>
        </div>
      </div>
    </header>
  );
}