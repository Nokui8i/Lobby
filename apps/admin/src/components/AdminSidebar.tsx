"use client";

import { staffCanAccessNav, STAFF_ROLE_LABELS, type AdminNavId } from "@lobby/shared";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FileText,
  LayoutDashboard,
  Megaphone,
  MessageSquare,
  Shield,
  Users,
  Wrench,
} from "lucide-react";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type NavItem = {
  id: AdminNavId;
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  soon?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { id: "dashboard", href: "/", label: "לוח בקרה", icon: LayoutDashboard },
  { id: "reports", href: "/reports", label: "דיווחים", icon: FileText },
  { id: "listings", href: "/listings", label: "מודעות", icon: Megaphone },
  { id: "users", href: "/users", label: "לקוחות", icon: Users },
  { id: "inquiries", href: "/inquiries", label: "פניות", icon: MessageSquare },
  { id: "staff", href: "/staff", label: "צוות", icon: Shield },
  { id: "site", href: "/site", label: "באנרים", icon: Wrench },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminSidebar() {
  const pathname = usePathname();
  const { user, staffRole, logout } = useAdminAuth();

  if (!staffRole) return null;

  return (
    <aside className="fixed inset-y-0 start-0 z-30 flex w-72 shrink-0 flex-col bg-white shadow-bubble">
      <div className="flex items-center gap-3 border-b border-border px-5 py-5">
        <span className="flex size-10 items-center justify-center rounded-[14px] bg-gradient-to-br from-primary to-[#008ecb] text-lg font-bold text-white">
          L
        </span>
        <div className="min-w-0">
          <p className="font-display text-lg leading-none font-semibold tracking-tight text-graphite">
            LOBBY
          </p>
          <p className="text-muted-foreground mt-0.5 text-xs">ניהול מערכת</p>
        </div>
      </div>

      <div className="px-4 pt-4">
        <Badge variant="secondary" className="w-fit font-bold">
          {STAFF_ROLE_LABELS[staffRole]}
        </Badge>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3 py-4" aria-label="ניווט אדמין">
        {NAV_ITEMS.filter((item) => staffCanAccessNav(staffRole, item.id)).map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.id}
              href={item.soon ? "#" : item.href}
              className={cn(
                "flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
                active
                  ? "bg-brand/10 text-primary"
                  : "text-muted-foreground hover:bg-soft hover:text-foreground",
                item.soon && "pointer-events-none opacity-60",
              )}
              aria-current={active ? "page" : undefined}
              onClick={item.soon ? (e) => e.preventDefault() : undefined}
            >
              <span className="flex items-center gap-2.5">
                <Icon className="size-4 shrink-0 opacity-80" />
                {item.label}
              </span>
              {item.soon ? (
                <span className="text-muted-foreground rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold">
                  בקרוב
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-4">
        <p className="text-muted-foreground mb-3 truncate text-xs">{user?.email ?? ""}</p>
        <Button
          type="button"
          variant="outline"
          className="text-destructive w-full border-destructive/20 hover:bg-destructive/5"
          onClick={() => void logout()}
        >
          יציאה
        </Button>
      </div>
    </aside>
  );
}

