"use client";

import { notFound, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  BedDouble,
  Building2,
  ClipboardList,
  DoorOpen,
  Home,
  Key,
  Layers,
  ListChecks,
  MapPin,
  Maximize2,
  MessageSquareQuote,
  Phone,
  Sparkles,
} from "lucide-react";
import {
  accountMessagesThreadPath,
  featureLabels,
  formatListingContactPhoneDisplay,
  formatListingLocationLine,
  normalizeListingContactPhone,
  type RentalListing,
} from "@lobby/shared";
import { useLobbyAuth } from "@/contexts/LobbyAuthContext";
import { createOrGetChatThread } from "@/lib/firebase/chat";
import { getFirestoreDb, ensureFirestoreAuthReady } from "@/lib/firebase/client";
import { isFirebaseConfigured } from "@/lib/firebase/isConfigured";
import { fetchListingByIdFromFirestore } from "@/lib/firebase/listingQueries";
import { AvatarBubble } from "@/components/lovable/ui";
import { DescriptionText } from "./DescriptionText";
import { ListingBannersSection } from "@/components/listing/ListingBannersSection";
import { ListingSidebarBannersSection } from "@/components/listing/ListingSidebarBannersSection";
import { ListingGallery } from "./ListingGallery";
import { PageMain } from "@/components/layout/PageMain";
import { ReportMenu } from "./ReportMenu";
import { cn } from "@/lib/utils";

interface ListingDetailClientProps {
  listingId: string;
  initialListing?: RentalListing | null;
}

/** פס נתונים אופקי — בסגנון יד2 */
function AtAGlanceItem({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="flex min-w-0 flex-1 items-center justify-center gap-2 px-4 py-3.5 text-center">
      <span className="shrink-0 text-graphite/45 [&>svg]:h-[18px] [&>svg]:w-[18px]">{icon}</span>
      <span className="text-[15px] font-bold text-graphite">{text}</span>
    </div>
  );
}

function detailRowIcon(label: string): ReactNode {
  switch (label) {
    case "סוג עסקה":
      return <Key aria-hidden />;
    case "סוג הנכס":
      return <Home aria-hidden />;
    case "מצב הנכס":
      return <Sparkles aria-hidden />;
    case "חדרים":
      return <BedDouble aria-hidden />;
    case 'שטח במ"ר':
      return <Maximize2 aria-hidden />;
    case "קומה":
      return <Building2 aria-hidden />;
    case "קומות בבניין":
      return <Layers aria-hidden />;
    case "כניסה":
      return <DoorOpen aria-hidden />;
    case "מאפיינים":
      return <ListChecks aria-hidden />;
    default:
      return <ClipboardList aria-hidden />;
  }
}

function ListingSectionHeading({
  title,
  icon,
}: {
  title: string;
  icon: ReactNode;
}) {
  return (
    <div className="mb-4 flex w-full items-center justify-start gap-2.5" dir="rtl">
      <h2 className="font-display m-0 text-lg font-bold text-graphite">{title}</h2>
      <span
        className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand [&>svg]:h-[18px] [&>svg]:w-[18px]"
        aria-hidden
      >
        {icon}
      </span>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="flex items-start gap-3 border-b border-slate-100 py-3.5 text-right last:border-b-0"
      dir="rtl"
    >
      <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-soft text-brand [&>svg]:h-4 [&>svg]:w-4">
        {detailRowIcon(label)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="m-0 text-xs font-semibold text-graphite/45">{label}</p>
        <p className="m-0 mt-1 text-[15px] font-bold leading-snug text-graphite">{value}</p>
      </div>
    </div>
  );
}

function floorDisplayLabel(floor: number, totalFloors: number): string {
  if (floor === 0) {
    return "קומת קרקע";
  }
  return `קומה ${floor}/${totalFloors}`;
}

export function ListingDetailClient({ listingId, initialListing }: ListingDetailClientProps) {
  const router = useRouter();
  const { user, openAuthModal } = useLobbyAuth();
  const [listing, setListing] = useState<RentalListing | null | undefined>(() =>
    initialListing ? initialListing : undefined,
  );
  const [chatBusy, setChatBusy] = useState(false);
  const [chatHint, setChatHint] = useState<string | null>(null);

  useEffect(() => {
    if (initialListing) return;
    setListing(undefined);
    let cancelled = false;

    async function load() {
      if (!isFirebaseConfigured()) {
        if (!cancelled) setListing(null);
        return;
      }
      try {
        const fromRemote = await fetchListingByIdFromFirestore(listingId);
        if (!cancelled) setListing(fromRemote ?? null);
      } catch {
        if (!cancelled) setListing(null);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [listingId, initialListing]);

  if (listing === undefined) {
    return (
      <PageMain flush>
        <p className="text-sm text-graphite/60" role="status">
          טוענים את המודעה…
        </p>
      </PageMain>
    );
  }

  if (listing === null) notFound();

  const activeListing = listing;
  const isPublicActive = activeListing.status === "active";
  const isOwner =
    Boolean(user?.uid) &&
    activeListing.publisher.id !== "unknown" &&
    user?.uid === activeListing.publisher.id;
  const ownerCanEditDraft =
    isOwner && activeListing.status === "draft" && Boolean(activeListing.moderationDraftNote?.trim());

  function statusBannerText(): string | null {
    if (activeListing.status === "pending_review") {
      return "המודעה נשלחה לבדיקת הצוות — לא מוצגת בפיד עד לאישור.";
    }
    if (activeListing.status === "draft") {
      if (activeListing.moderationDraftNote?.trim()) {
        return `נדרש עדכון: ${activeListing.moderationDraftNote.trim()}`;
      }
      return "מודעת טיוטה — לא מוצגת בפיד הציבורי.";
    }
    if (activeListing.status === "frozen") return "מודעה מוקפאת — לא מוצגת בפיד.";
    if (activeListing.status === "expired") return "מודעה שפגה.";
    if (activeListing.status === "rented" || activeListing.status === "removed") return "מודעה לא פעילה.";
    return null;
  }

  async function handleStartChat() {
    setChatHint(null);
    if (!isFirebaseConfigured()) {
      setChatHint("אין חיבור לשרת.");
      return;
    }
    if (!user) {
      openAuthModal();
      return;
    }
    const publisherUid = activeListing.publisher.id;
    if (!publisherUid || publisherUid === "unknown") {
      setChatHint("לא נמצאו פרטי מפרסם.");
      return;
    }
    if (user.uid === publisherUid) {
      setChatHint("זו המודעה שלך.");
      return;
    }
    if (!isPublicActive) {
      setChatHint("צ׳אט זמין רק למודעות פעילות.");
      return;
    }
    setChatBusy(true);
    try {
      try {
        await ensureFirestoreAuthReady(user);
      } catch {
        /* ignore */
      }
      const threadId = await createOrGetChatThread(getFirestoreDb(), {
        listingId: activeListing.id,
        listingTitle: activeListing.title,
        publisherUserId: publisherUid,
        renterUserId: user.uid,
      });
      router.push(accountMessagesThreadPath(threadId));
    } catch {
      setChatHint("לא הצלחנו לפתוח שיחה.");
    } finally {
      setChatBusy(false);
    }
  }

  const listingStatusNote = statusBannerText();
  const entryValue =
    activeListing.entryDate?.trim() === "מיידי"
      ? "מיידית"
      : activeListing.entryDate?.trim() || "—";
  const featuresSummary =
    activeListing.features.length > 0
      ? activeListing.features.map((f) => featureLabels[f]).join(", ")
      : null;

  const detailRows: { label: string; value: string }[] = [
    { label: "סוג עסקה", value: "השכרה" },
    ...(activeListing.propertyTypeLabel?.trim()
      ? [{ label: "סוג הנכס", value: activeListing.propertyTypeLabel.trim() }]
      : []),
    ...(activeListing.propertyConditionLabel?.trim()
      ? [{ label: "מצב הנכס", value: activeListing.propertyConditionLabel.trim() }]
      : []),
    { label: "חדרים", value: String(activeListing.rooms) },
    { label: 'שטח במ"ר', value: String(activeListing.sizeSqm) },
    {
      label: "קומה",
      value: floorDisplayLabel(activeListing.floor, activeListing.totalFloors),
    },
    { label: "קומות בבניין", value: String(activeListing.totalFloors) },
    { label: "כניסה", value: entryValue },
    ...(featuresSummary ? [{ label: "מאפיינים", value: featuresSummary }] : []),
  ];

  return (
    <PageMain flush className="max-w-none px-0 sm:px-0">
      <div className="mx-auto w-full max-w-[1400px] bg-white px-4 pb-12 sm:px-6">
        {ownerCanEditDraft ? (
          <div className="mb-4 flex justify-end pt-2">
            <button
              type="button"
              className="btn-puffy px-6 py-2.5 text-sm"
              onClick={() => router.push(`/publish?listingId=${activeListing.id}`)}
            >
              עריכת המודעה
            </button>
          </div>
        ) : null}

        {listingStatusNote ? (
          <p className="mb-4 rounded-2xl border border-brand/20 bg-brand/5 px-4 py-3 text-sm font-semibold text-graphite" role="status">
            {listingStatusNote}
          </p>
        ) : null}

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-8">
          <div className="min-w-0 space-y-4">
            <ListingGallery
              imageUrl={activeListing.imageUrl}
              gallery={activeListing.gallery}
              title={activeListing.title}
              listingId={activeListing.id}
              priceIls={activeListing.priceIls}
              video={activeListing.video}
            />
            <ListingBannersSection />

            <header className="text-right">
              <h1 className="text-[26px] font-bold leading-tight text-graphite md:text-[30px]">{activeListing.title}</h1>
              <p className="mt-2 text-right">
                <span className="inline-flex flex-row-reverse items-center gap-1.5 text-[15px] font-medium text-graphite/70">
                  <MapPin className="h-4 w-4 shrink-0 text-graphite/40" aria-hidden />
                  {formatListingLocationLine(activeListing)}
                </span>
              </p>
            </header>

            <div
              className="flex overflow-hidden rounded-xl border border-slate-200/80 bg-[#F4F6F8] divide-x divide-x-reverse divide-slate-200/70"
              aria-label="נתונים עיקריים"
            >
              <AtAGlanceItem icon={<BedDouble aria-hidden />} text={`${activeListing.rooms} חדרים`} />
              <AtAGlanceItem
                icon={<Building2 aria-hidden />}
                text={floorDisplayLabel(activeListing.floor, activeListing.totalFloors)}
              />
              <AtAGlanceItem icon={<Maximize2 aria-hidden />} text={`${activeListing.sizeSqm} מ״ר`} />
            </div>

            {activeListing.description.trim() ? (
              <section className="bubble-card rounded-[16px] border-0 bg-soft/50 px-5 py-4 shadow-bubble sm:px-6 sm:py-5">
                <ListingSectionHeading title="תיאור המפרסם" icon={<MessageSquareQuote aria-hidden />} />
                <DescriptionText text={activeListing.description} />
              </section>
            ) : null}

            <section className="border-t border-slate-200/90 pt-6">
              <ListingSectionHeading title="פרטים נוספים" icon={<ClipboardList aria-hidden />} />
              <div className="bubble-card rounded-[16px] border-0 bg-white px-4 py-1 shadow-bubble sm:px-5">
                <div className="grid gap-x-10 sm:grid-cols-2">
                  <div>
                    {detailRows.slice(0, Math.ceil(detailRows.length / 2)).map((row) => (
                      <DetailRow key={row.label} label={row.label} value={row.value} />
                    ))}
                  </div>
                  <div>
                    {detailRows.slice(Math.ceil(detailRows.length / 2)).map((row) => (
                      <DetailRow key={row.label} label={row.label} value={row.value} />
                    ))}
                  </div>
                </div>
              </div>
            </section>
          </div>

          <aside className="space-y-4 lg:sticky lg:top-[calc(var(--header-height)+1rem)] lg:z-20 lg:self-start">
            <div className="bubble-card overflow-hidden shadow-bubble" style={{ borderRadius: 16 }}>
              <div className="border-b border-slate-100 bg-soft/60 px-5 py-4 text-right">
                <p
                  className="font-display text-[22px] font-bold leading-tight tracking-tight text-graphite md:text-[24px]"
                  dir="ltr"
                >
                  ₪{activeListing.priceIls.toLocaleString("he-IL")}
                </p>
              </div>

              <div className="space-y-4 p-5">
                <div className="flex items-center gap-3">
                  <AvatarBubble
                    name={activeListing.publisher.displayName}
                    className="h-11 w-11 shrink-0 text-base shadow-bubble"
                  />
                  <p className="min-w-0 truncate text-base font-bold text-graphite">
                    {activeListing.publisher.displayName}
                  </p>
                </div>

                {activeListing.publisher.contactPhone ? (
                  <a
                    href={`tel:${normalizeListingContactPhone(activeListing.publisher.contactPhone)}`}
                    className={cn(
                      "flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200/90 bg-white py-3.5",
                      "text-[15px] font-semibold text-graphite shadow-bubble transition-colors hover:bg-soft",
                    )}
                  >
                    <Phone className="h-4 w-4 shrink-0" aria-hidden />
                    {formatListingContactPhoneDisplay(activeListing.publisher.contactPhone)}
                  </a>
                ) : null}

                <button
                  type="button"
                  className={cn(
                    "btn-puffy shadow-puffy w-full rounded-xl py-3.5 text-[15px] font-semibold",
                    "shadow-[0_2px_8px_rgba(0,157,224,0.28)]",
                  )}
                  disabled={chatBusy || !isPublicActive}
                  onClick={() => void handleStartChat()}
                >
                  {!isPublicActive ? "צ׳אט לא זמין" : chatBusy ? "פותחים שיחה…" : "שליחת הודעה למפרסם"}
                </button>
                {chatHint ? <p className="text-center text-xs font-semibold text-red-600">{chatHint}</p> : null}

                {isPublicActive ? (
                  <div className="space-y-2 border-t border-slate-100 pt-4">
                    <p className="text-center text-[11px] leading-relaxed text-graphite/50">
                      ראיתם דרישת עמלה? דווחו מהמודעה — הצוות יטפל.
                    </p>
                    <ReportMenu
                      listingId={activeListing.id}
                      listingTitle={activeListing.title}
                      variant="cardFooter"
                    />
                  </div>
                ) : null}
              </div>
            </div>
            <ListingSidebarBannersSection />
          </aside>
        </div>
      </div>
    </PageMain>
  );
}
