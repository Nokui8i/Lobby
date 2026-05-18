"use client";

import { staffCanAccessNav } from "@lobby/shared";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { AdminDashboardStats } from "@lobby/shared";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { fetchAdminDashboardStats } from "@/lib/firebase/functions";
import styles from "./dashboard.module.css";

type DashCard = {
  key: string;
  title: string;
  href?: string;
  enabled: boolean;
  lines: { label: string; value: string | number }[];
};

export default function AdminDashboardPage() {
  const { user, staffRole, staffRoleLabel } = useAdminAuth();
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await fetchAdminDashboardStats();
      setStats(data);
    } catch {
      setStats(null);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (staffRole) {
      void load();
    }
  }, [staffRole, load]);

  if (!staffRole) {
    return null;
  }

  const cards: DashCard[] = [
    {
      key: "reports",
      title: "דיווחים",
      href: "/reports",
      enabled: staffCanAccessNav(staffRole, "reports"),
      lines: [
        {
          label: "דיווחים פתוחים",
          value: loading ? "…" : error ? "—" : (stats?.openReports ?? 0),
        },
      ],
    },
    {
      key: "listings",
      title: "מודעות פעילות",
      enabled: true,
      lines: [
        {
          label: "גלויות בלוח כרגע",
          value: loading ? "…" : error ? "—" : (stats?.activeListings ?? 0),
        },
      ],
    },
    {
      key: "inquiries",
      title: "פניות",
      href: "/inquiries",
      enabled: staffCanAccessNav(staffRole, "inquiries"),
      lines: [
        {
          label: "פתוחות לטיפול",
          value: loading ? "…" : error ? "—" : (stats?.openInquiries ?? 0),
        },
      ],
    },
  ];

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1>לוח בקרה</h1>
          <p className={styles.welcome}>
            שלום{user?.email ? `, ${user.email}` : ""} · {staffRoleLabel}
          </p>
        </div>
        <button type="button" className={styles.refreshBtn} disabled={loading} onClick={() => void load()}>
          רענון
        </button>
      </header>

      {error ? (
        <p className={styles.error} role="alert">
          לא הצלחנו לטעון נתונים. ודאו ש־Cloud Functions מפורסמות ונסו שוב.
        </p>
      ) : null}

      <div className={styles.grid}>
        {cards
          .filter((c) => c.enabled)
          .map((card) => {
            const body = (
              <>
                <h2>{card.title}</h2>
                <div className={styles.metrics}>
                  {card.lines.map((line) => (
                    <div key={line.label} className={styles.metricRow}>
                      <span className={styles.metricValue}>{line.value}</span>
                      <span className={styles.metricLabel}>{line.label}</span>
                    </div>
                  ))}
                </div>
              </>
            );

            if (card.href) {
              return (
                <Link key={card.key} href={card.href} className={styles.card}>
                  {body}
                </Link>
              );
            }

            return (
              <article key={card.key} className={`${styles.card} ${styles.cardStat}`}>
                {body}
              </article>
            );
          })}
      </div>
    </div>
  );
}
