"use client";

import {
  HOME_BANNERS_COLLECTION,
  SITE_BANNER_PLACEMENT_HOME,
  SITE_BANNER_PLACEMENT_LISTING,
  SITE_BANNER_PLACEMENT_LISTING_SIDEBAR,
  type HomeBannerRecord,
  type SiteBannerPlacement,
} from "@lobby/shared";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { ap } from "@/lib/admin-page-classes";
import { getFunctions, httpsCallable } from "firebase/functions";
import { formatFirebaseError } from "@/lib/firebaseErrorMessage";
import {
  ensureAdminFirestoreAuthReady,
  getFirebaseApp,
  getFirestoreDb,
} from "@/lib/firebase/client";
import type { User } from "firebase/auth";
import { cn } from "@/lib/utils";
import { parseSiteBannerRecord, SiteBannerPlacementPanel } from "./SiteBannerPlacementPanel";

const TABS: { id: SiteBannerPlacement; label: string; description: string }[] = [
  {
    id: SITE_BANNER_PLACEMENT_HOME,
    label: "דף הבית",
    description: "באנרי לובי בראש דף הבית — פרסום פנימי של הפלטפורמה.",
  },
  {
    id: SITE_BANNER_PLACEMENT_LISTING,
    label: "עמוד מודעה · לובי",
    description: "באנר אופקי בתוך עמוד המודעה — פרסום פנימי של לובי.",
  },
  {
    id: SITE_BANNER_PLACEMENT_LISTING_SIDEBAR,
    label: "עמוד מודעה · פרסום",
    description: "באנר ריבועי מתחת לכרטיס המפרסם — פרסום חיצוני לחברות.",
  },
];

async function syncStaffRoleFromServer(user: User): Promise<{ ok: true } | { ok: false; message: string }> {
  await ensureAdminFirestoreAuthReady(user);
  try {
    const fn = httpsCallable<Record<string, never>, { role: string }>(
      getFunctions(getFirebaseApp(), "us-central1"),
      "lobbyAdminResolveMyStaffRole",
    );
    await fn({});
  } catch (err) {
    return { ok: false, message: formatFirebaseError(err) };
  }
  try {
    await user.getIdToken(true);
  } catch {
    /* ignore */
  }
  return { ok: true };
}

export function SiteBannersAdmin() {
  const { user, staffRole } = useAdminAuth();
  const canEdit = staffRole === "admin" || staffRole === "owner";

  const [activeTab, setActiveTab] = useState<SiteBannerPlacement>(SITE_BANNER_PLACEMENT_HOME);
  const [allBanners, setAllBanners] = useState<HomeBannerRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [staffSyncWarning, setStaffSyncWarning] = useState<string | null>(null);

  const homeBanners = useMemo(
    () => allBanners.filter((b) => b.placement === SITE_BANNER_PLACEMENT_HOME),
    [allBanners],
  );
  const listingBanners = useMemo(
    () => allBanners.filter((b) => b.placement === SITE_BANNER_PLACEMENT_LISTING),
    [allBanners],
  );
  const listingSidebarBanners = useMemo(
    () => allBanners.filter((b) => b.placement === SITE_BANNER_PLACEMENT_LISTING_SIDEBAR),
    [allBanners],
  );

  const activeBanners = useMemo(() => {
    if (activeTab === SITE_BANNER_PLACEMENT_HOME) return homeBanners;
    if (activeTab === SITE_BANNER_PLACEMENT_LISTING) return listingBanners;
    return listingSidebarBanners;
  }, [activeTab, homeBanners, listingBanners, listingSidebarBanners]);

  const activeTabMeta = TABS.find((t) => t.id === activeTab) ?? TABS[0]!;

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setErrorMessage(null);
    setStaffSyncWarning(null);
    try {
      const sync = await syncStaffRoleFromServer(user);
      if (!sync.ok) {
        setStaffSyncWarning(
          `${sync.message} — העלאה עלולה להיכשל עד שסנכרון הצוות יצליח.`,
        );
      }
      const db = getFirestoreDb();
      const snap = await getDocs(
        query(collection(db, HOME_BANNERS_COLLECTION), orderBy("sortOrder", "asc")),
      );
      setAllBanners(
        snap.docs
          .map((d) => parseSiteBannerRecord(d.id, d.data() as Record<string, unknown>))
          .filter((row): row is HomeBannerRecord => row !== null),
      );
    } catch (err) {
      setAllBanners([]);
      setErrorMessage(formatFirebaseError(err));
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="mx-auto w-full max-w-[1100px]">
      <header className={ap.header}>
        <div>
          <h1 className={ap.title}>באנרים</h1>
          <p className={ap.sub} key={activeTab}>
            {activeTabMeta.description}
          </p>
        </div>
        <button type="button" className={ap.refreshBtn} disabled={loading} onClick={() => void load()}>
          <RefreshCw className={cn("inline-block size-4 align-[-2px] ms-1", loading && "animate-spin")} />
          רענון
        </button>
      </header>

      <div className="mb-4 flex flex-col items-start gap-3">
      <div
        className="inline-flex max-w-full flex-wrap gap-1 rounded-xl border border-border bg-muted/25 p-1"
        role="tablist"
        aria-label="מיקום באנר"
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-bold transition-colors sm:text-sm",
              activeTab === tab.id
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-card/80 hover:text-foreground",
            )}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      </div>

      {staffSyncWarning ? (
        <p className="mb-3 rounded-lg border border-amber-300/80 bg-amber-50 px-3 py-2 text-xs text-amber-950" role="status">
          {staffSyncWarning}
        </p>
      ) : null}

      {errorMessage ? (
        <p className={cn(ap.error, "mb-3")} role="alert">
          {errorMessage}
        </p>
      ) : null}

      {!canEdit ? (
        <p className="text-muted-foreground mb-4 text-sm">צפייה בלבד — נדרש תפקיד מנהל לעריכה.</p>
      ) : null}

      <div role="tabpanel">
        <SiteBannerPlacementPanel
          key={activeTab}
          placement={activeTab}
          banners={activeBanners}
          loading={loading}
          onReload={load}
          onError={setErrorMessage}
        />
      </div>
    </div>
  );
}
