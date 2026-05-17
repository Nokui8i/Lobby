"use client";

import { staffCanAccessNav, STAFF_ROLE_LABELS, type AdminNavId } from "@lobby/shared";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import styles from "./AdminSidebar.module.css";

type NavItem = {
  id: AdminNavId;
  href: string;
  label: string;
  soon?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { id: "dashboard", href: "/", label: "לוח בקרה" },
  { id: "reports", href: "/reports", label: "דיווחים" },
  { id: "users", href: "/users", label: "לקוחות" },
  { id: "staff", href: "/staff", label: "צוות" },
  { id: "site", href: "/site", label: "תוכן ושיווק", soon: true },
];

function isActive(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminSidebar() {
  const pathname = usePathname();
  const { user, staffRole, logout } = useAdminAuth();

  if (!staffRole) {
    return null;
  }

  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>
        <span className={styles.brandMark}>L</span>
        <div>
          <strong className={styles.brandTitle}>Lobby</strong>
          <span className={styles.brandSub}>ניהול מערכת</span>
        </div>
      </div>

      <p className={styles.roleBadge}>{STAFF_ROLE_LABELS[staffRole]}</p>

      <nav className={styles.nav} aria-label="ניווט אדמין">
        {NAV_ITEMS.filter((item) => staffCanAccessNav(staffRole, item.id)).map((item) => (
          <Link
            key={item.id}
            href={item.soon ? "#" : item.href}
            className={`${styles.navLink} ${isActive(pathname, item.href) ? styles.navLinkActive : ""} ${item.soon ? styles.navLinkSoon : ""}`}
            aria-current={isActive(pathname, item.href) ? "page" : undefined}
            onClick={item.soon ? (e) => e.preventDefault() : undefined}
          >
            <span>{item.label}</span>
            {item.soon ? <span className={styles.soonTag}>בקרוב</span> : null}
          </Link>
        ))}
      </nav>

      <div className={styles.footer}>
        <p className={styles.userEmail}>{user?.email ?? ""}</p>
        <button type="button" className={styles.logoutBtn} onClick={() => void logout()}>
          יציאה
        </button>
      </div>
    </aside>
  );
}
