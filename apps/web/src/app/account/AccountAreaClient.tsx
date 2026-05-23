"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useLobbyNotificationsOptional } from "@/contexts/LobbyNotificationsContext";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Bell, Heart, Eye } from "lucide-react";
import { SAVED_LISTINGS_TITLE_HE, type RentalListing } from "@lobby/shared";
import { useLobbyAuth } from "@/contexts/LobbyAuthContext";
import { isFirebaseConfigured } from "@/lib/firebase/isConfigured";
import { fetchMyListingsFromFirestore } from "@/lib/firebase/listingQueries";
import { AccountListingRow } from "./AccountListingRow";

type AccountTab = "active" | "draft" | "offFeed";

function listingMatchesTab(listing: RentalListing, tab: AccountTab): boolean {
  if (tab === "active") {
    return (
      listing.status === "active" ||
      listing.status === "frozen" ||
      listing.status === "pending_review"
    );
  }
  if (tab === "draft") {
    return listing.status === "draft";
  }
  return listing.status === "expired" || listing.status === "removed" || listing.status === "rented";
}

const TAB_LABELS: Record<AccountTab, string> = {
  active: "פעילות בלוח",
  draft: "טיוטות",
  offFeed: "לא מוצגות",
};

function tabFromSearchParams(searchParams: URLSearchParams): AccountTab {
  const t = searchParams.get("tab");
  if (t === "draft") return "draft";
  if (t === "offFeed") return "offFeed";
  return "active";
}

export function AccountAreaClient() {
  const { user, loading, openAuthModal } = useLobbyAuth();
  const searchParams = useSearchParams();
  const tab = tabFromSearchParams(searchParams);
  const [rows, setRows] = useState<RentalListing[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState(false);

  const load = useCallback(async () => {
    if (!user || !isFirebaseConfigured()) {
      setRows([]);
      return;
    }
    setListLoading(true);
    setListError(false);
    try {
      const data = await fetchMyListingsFromFirestore(user.uid);
      setRows(data);
    } catch {
      setRows([]);
      setListError(true);
    } finally {
      setListLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => rows.filter((l) => listingMatchesTab(l, tab)), [rows, tab]);
  const moderationDraftCount = useMemo(
    () => rows.filter((l) => l.status === "draft" && Boolean(l.moderationDraftNote?.trim())).length,
    [rows],
  );
  const activeCount = useMemo(
    () => rows.filter((l) => l.status === "active" || l.status === "pending_review").length,
    [rows],
  );
  const notifCtx = useLobbyNotificationsOptional();
  const notifUnread = notifCtx?.unreadCount ?? 0;

  if (!isFirebaseConfigured()) {
    return <p className="text-sm text-graphite/60">Firebase אינו מוגדר — לא ניתן לטעון את האזור האישי.</p>;
  }

  if (loading) {
    return <p className="text-sm text-graphite/60">טוען…</p>;
  }

  if (!user) {
    return (
      <>
        <h1 className="mb-4 text-3xl font-black text-graphite">האזור האישי</h1>
        <button type="button" className="btn-puffy px-8 py-3 text-sm" onClick={openAuthModal}>
          התחברות / הרשמה
        </button>
      </>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {[
          { icon: <Eye />, label: "צפיות במודעות", value: String(activeCount) },
          { icon: <Bell />, label: "התראות", value: notifUnread > 0 ? String(notifUnread) : "0", href: "/account/notifications" },
          { icon: <Heart />, label: SAVED_LISTINGS_TITLE_HE, value: "—", href: "/saved" },
        ].map((s) => {
          const inner = (
            <div className="bubble-card p-4" style={{ borderRadius: 14 }}>
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-brand/10 text-brand [&>svg]:h-4 [&>svg]:w-4">{s.icon}</div>
              <div className="mt-3 text-xl font-bold text-graphite">{s.value}</div>
              <div className="mt-0.5 text-[11px] text-graphite/50">{s.label}</div>
            </div>
          );
          if ("href" in s && s.href) {
            return (
              <Link key={s.label} href={s.href} className="block no-underline transition hover:-translate-y-0.5">
                {inner}
              </Link>
            );
          }
          return <div key={s.label}>{inner}</div>;
        })}
      </div>

      <div className="mt-8">
        <h2 className="font-display mb-4 text-xl font-semibold text-graphite">המודעות שלי · {TAB_LABELS[tab]}</h2>

        {moderationDraftCount > 0 && tab !== "draft" ? (
          <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-right text-sm font-semibold text-red-800" role="status">
            {moderationDraftCount === 1
              ? "יש מודעת טיוטה שדורשת עדכון לפני פרסום חוזר."
              : `יש ${moderationDraftCount} מודעות טיוטה שדורשות עדכון לפני פרסום חוזר.`}{" "}
            <Link href="/account?tab=draft" className="font-bold text-brand underline">
              מעבר לטיוטות
            </Link>
          </p>
        ) : null}

        {listLoading && rows.length === 0 ? <p className="py-6 text-sm text-graphite/60">טוען מודעות…</p> : null}
        {listError ? <p className="py-6 text-sm text-graphite/60">לא הצלחנו לטעון את המודעות. נסה שוב מאוחר יותר.</p> : null}
        {!listLoading && !listError && filtered.length === 0 ? (
          <div className="bubble-card py-10 text-center" style={{ borderRadius: 14 }}>
            <p className="text-sm text-graphite/60">אין מודעות בקטגוריה הזו.</p>
            <Link href="/publish" className="btn-puffy mt-4 inline-flex px-6 py-2.5 text-sm no-underline">
              לפרסום מודעה חדשה
            </Link>
          </div>
        ) : null}

        <div className="space-y-2.5">
          {filtered.map((listing) => (
            <AccountListingRow key={listing.id} listing={listing} onChanged={() => void load()} />
          ))}
        </div>
      </div>
    </>
  );
}
