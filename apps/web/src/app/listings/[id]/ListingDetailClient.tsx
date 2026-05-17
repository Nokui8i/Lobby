"use client";

import Link from "next/link";
import { notFound, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { featureLabels, formatListingLocationLine, type RentalListing } from "@lobby/shared";
import { AuthToolbar } from "@/components/AuthToolbar";
import { useLobbyAuth } from "@/contexts/LobbyAuthContext";
import { createOrGetChatThread } from "@/lib/firebase/chat";
import { getFirestoreDb, ensureFirestoreAuthReady } from "@/lib/firebase/client";
import { isFirebaseConfigured } from "@/lib/firebase/isConfigured";
import { fetchListingByIdFromFirestore } from "@/lib/firebase/listingQueries";
import { DescriptionText } from "./DescriptionText";
import { ListingGallery } from "./ListingGallery";
import { ListingVideoPlayer } from "./ListingVideoPlayer";
import { ReportMenu } from "./ReportMenu";
import styles from "./page.module.css";

interface ListingDetailClientProps {
  listingId: string;
}

export function ListingDetailClient({ listingId }: ListingDetailClientProps) {
  const router = useRouter();
  const { user, openAuthModal } = useLobbyAuth();
  const [listing, setListing] = useState<RentalListing | null | undefined>(undefined);
  const [chatBusy, setChatBusy] = useState(false);
  const [chatHint, setChatHint] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!isFirebaseConfigured()) {
        if (!cancelled) {
          setListing(null);
        }
        return;
      }

      try {
        const fromRemote = await fetchListingByIdFromFirestore(listingId);

        if (cancelled) {
          return;
        }

        if (fromRemote) {
          setListing(fromRemote);
          return;
        }
      } catch {
        /* ignore */
      }

      if (!cancelled) {
        setListing(null);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [listingId]);

  if (listing === undefined) {
    return (
      <main className={styles.page}>
        <div className={styles.shell}>
          <p className={styles.loadingMessage} role="status">
            טוענים את המודעה…
          </p>
        </div>
      </main>
    );
  }

  if (listing === null) {
    notFound();
  }

  const activeListing = listing;
  const isPublicActive = activeListing.status === "active";

  function statusBannerText(): string | null {
    if (activeListing.status === "draft") {
      if (activeListing.moderationDraftNote?.trim()) {
        return `נדרש עדכון מהצוות: ${activeListing.moderationDraftNote.trim()}`;
      }
      return "מודעת טיוטה — לא מוצגת בפיד הציבורי. אחרי תשלום פרסום המודעה תפורסם לפי כללי Lobby.";
    }
    if (activeListing.status === "frozen") {
      return "מודעה מוקפאת — לא מוצגת בפיד. תקופת ה-30 יום ממשיכה לרוץ. אפשר להחזיר לפרסום מהאזור האישי.";
    }
    if (activeListing.status === "expired") {
      return "מודעה שפגה — לא מוצגת כרגע לשוכרים.";
    }
    if (activeListing.status === "rented" || activeListing.status === "removed") {
      return "מודעה לא פעילה.";
    }
    return null;
  }

  async function handleStartChat() {
    setChatHint(null);

    if (!isFirebaseConfigured()) {
      setChatHint("אין חיבור לשרת — לא ניתן לפתוח צ׳אט.");
      return;
    }

    if (!user) {
      openAuthModal();
      return;
    }

    const publisherUid = activeListing.publisher.id;

    if (!publisherUid || publisherUid === "unknown") {
      setChatHint("לא נמצאו פרטי מפרסם במודעה — לא ניתן לפתוח שיחה.");
      return;
    }

    if (user.uid === publisherUid) {
      setChatHint("זו המודעה שלך — לא נפתחת שיחה עם עצמך.");
      return;
    }

    if (!isPublicActive) {
      setChatHint("המודעה אינה פעילה בפיד — צ׳אט זמין רק למודעות שפורסמו.");
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
      router.push(`/chat/${threadId}`);
    } catch {
      setChatHint("לא הצלחנו לפתוח שיחה. נסו שוב.");
    } finally {
      setChatBusy(false);
    }
  }

  const listingStatusNote = statusBannerText();

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <Link href="/" className={styles.backIcon} aria-label="חזרה">
            <span className={styles.backArrowIcon} aria-hidden="true" />
          </Link>
          <Link href="/" className={styles.logo}>
            LOBBY
          </Link>
          <div className={styles.headerListingActions}>
            {isPublicActive ? (
              <ReportMenu listingId={activeListing.id} listingTitle={activeListing.title} />
            ) : null}
            <AuthToolbar variant="listing" />
          </div>
        </header>

        {listingStatusNote ? (
          <p className={styles.draftBanner} role="status">
            {listingStatusNote}
          </p>
        ) : null}

        <ListingGallery
          imageUrl={activeListing.imageUrl}
          gallery={activeListing.gallery}
          title={activeListing.title}
          listingId={activeListing.id}
          priceIls={activeListing.priceIls}
        />
        {activeListing.video?.url ? (
          <ListingVideoPlayer video={activeListing.video} title={activeListing.title} />
        ) : null}

        <section className={styles.content}>
          <article className={styles.mainCard}>
            <h1>{activeListing.title}</h1>
            <p className={styles.location}>{formatListingLocationLine(activeListing)}</p>

            <div className={styles.stats}>
              <div>
                <strong>₪{activeListing.priceIls.toLocaleString("he-IL")}</strong>
                <span>לחודש</span>
              </div>
              <div>
                <strong>{activeListing.rooms}</strong>
                <span>חדרים</span>
              </div>
              <div>
                <strong>{activeListing.sizeSqm}</strong>
                <span>מ״ר</span>
              </div>
              <div>
                <strong>
                  {activeListing.floor}/{activeListing.totalFloors}
                </strong>
                <span>קומה</span>
              </div>
            </div>

            <h2>על הדירה</h2>
            <DescriptionText text={activeListing.description} />

            <h2>מה יש בדירה?</h2>
            <div className={styles.features}>
              {activeListing.features.map((feature) => (
                <span key={feature}>{featureLabels[feature]}</span>
              ))}
            </div>
          </article>

          <aside className={styles.contactCard}>
            <div>
              <h2>{activeListing.publisher.displayName}</h2>
            </div>
            <button
              type="button"
              className={styles.chatButton}
              disabled={chatBusy || !isPublicActive}
              onClick={() => void handleStartChat()}
            >
              {!isPublicActive ? "צ׳אט — לא זמין לטיוטה" : chatBusy ? "פותחים שיחה…" : "שליחת הודעה בצ׳אט"}
            </button>
            {chatHint ? <p className={styles.chatHint}>{chatHint}</p> : null}
            <button type="button" className={styles.phoneButton} disabled={!isPublicActive}>
              הצגת פרטי התקשרות
            </button>
            <p className={styles.policy}>
              אם דרשו ממך עמלת תיווך או תשלום צדדי, דווח לנו מיד מהכפתור למעלה.
            </p>
          </aside>
        </section>
      </div>
    </main>
  );
}
