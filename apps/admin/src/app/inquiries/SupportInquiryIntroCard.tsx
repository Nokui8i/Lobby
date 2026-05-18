import Link from "next/link";
import { formatChatMessageTime, formatSupportInquiryReference, type SupportInquiryRecord } from "@lobby/shared";
import { adminUsersSearchUrl, consumerListingUrl } from "@/lib/consumerUrls";
import styles from "./inquiriesChat.module.css";

export function SupportInquiryIntroCard({ inquiry }: { inquiry: SupportInquiryRecord }) {
  const createdLabel = inquiry.createdAt ? formatChatMessageTime(inquiry.createdAt) : "";

  return (
    <div className={styles.introCard} role="article" aria-label="פרטי פנייה">
      <p className={styles.introCardTitle}>
        פנייה #{formatSupportInquiryReference(inquiry.referenceNumber)} · {inquiry.categoryLabel}
      </p>
      <p className={styles.introCardMeta}>
        <strong>{inquiry.subject}</strong>
        {createdLabel ? ` · ${createdLabel}` : ""}
      </p>
      <p className={styles.introCardMeta}>
        ממערכת:{" "}
        <Link href={adminUsersSearchUrl(inquiry.userEmail || inquiry.userId)}>
          {inquiry.userEmail || inquiry.displayName || inquiry.userId}
        </Link>
        {inquiry.listingId ? (
          <>
            {" · מודעה: "}
            <Link href={consumerListingUrl(inquiry.listingId)} target="_blank" rel="noopener noreferrer">
              {inquiry.listingTitle || inquiry.listingId}
            </Link>
            {" · "}
            <Link href={`/listings/${inquiry.listingId}`}>עריכה באדמין</Link>
          </>
        ) : null}
      </p>
      {inquiry.userResolvedAt ? (
        <p className={styles.introCardMeta}>הלקוח סימן שהבעיה נפתרה — אפשר לסגור או להמשיך לענות.</p>
      ) : null}
    </div>
  );
}
