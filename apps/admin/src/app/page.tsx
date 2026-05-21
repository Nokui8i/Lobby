"use client";

import { staffCanAccessNav } from "@lobby/shared";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { AdminDashboardStats } from "@lobby/shared";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { fetchAdminDashboardStats } from "@/lib/firebase/functions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

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
    if (staffRole) void load();
  }, [staffRole, load]);

  if (!staffRole) return null;

  const cards: DashCard[] = [
    {
      key: "reports",
      title: "דיווחים",
      href: "/reports",
      enabled: staffCanAccessNav(staffRole, "reports"),
      lines: [{ label: "דיווחים פתוחים", value: loading ? "…" : error ? "—" : (stats?.openReports ?? 0) }],
    },
    {
      key: "listings",
      title: "מודעות פעילות",
      enabled: true,
      lines: [{ label: "גלויות בלוח כרגע", value: loading ? "…" : error ? "—" : (stats?.activeListings ?? 0) }],
    },
    {
      key: "inquiries",
      title: "פניות",
      href: "/inquiries",
      enabled: staffCanAccessNav(staffRole, "inquiries"),
      lines: [{ label: "פתוחות לטיפול", value: loading ? "…" : error ? "—" : (stats?.openInquiries ?? 0) }],
    },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl tracking-tight">לוח בקרה</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            שלום{user?.email ? `, ${user.email}` : ""} · {staffRoleLabel}
          </p>
        </div>
        <Button type="button" variant="outline" disabled={loading} onClick={() => void load()}>
          רענון
        </Button>
      </header>

      {error ? (
        <p className="text-destructive bg-destructive/10 rounded-lg border px-4 py-3 text-sm" role="alert">
          לא הצלחנו לטעון נתונים. ודאו ש־Cloud Functions מפורסמות ונסו שוב.
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards
          .filter((c) => c.enabled)
          .map((card) => {
            const inner = (
              <Card
                className={cn(
                  "h-full transition-shadow",
                  card.href && "hover:border-primary/40 hover:shadow-md",
                )}
              >
                <CardHeader className="pb-2">
                  <CardTitle>{card.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  {card.lines.map((line) => (
                    <div key={line.label} className="space-y-1">
                      <p className="text-primary text-3xl font-bold tracking-tight">{line.value}</p>
                      <p className="text-muted-foreground text-sm">{line.label}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            );

            if (card.href) {
              return (
                <Link key={card.key} href={card.href} className="block h-full">
                  {inner}
                </Link>
              );
            }
            return <div key={card.key}>{inner}</div>;
          })}
      </div>
    </div>
  );
}
