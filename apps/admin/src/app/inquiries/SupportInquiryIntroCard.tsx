import Link from "next/link";
import { formatChatMessageTime, formatSupportInquiryReference, type SupportInquiryRecord } from "@lobby/shared";
import { adminUsersSearchUrl, consumerListingUrl } from "@/lib/consumerUrls";
import { ic } from "@/lib/admin-page-classes";
import { cn } from "@/lib/utils";

export function SupportInquiryIntroCard({ inquiry }: { inquiry: SupportInquiryRecord }) {
  const createdLabel = inquiry.createdAt ? formatChatMessageTime(inquiry.createdAt) : "";

  return (
    <div className={ic.introCard} role="article" aria-label="פרטי פנייה">
      <p className={ic.introCardTitle}>
        פנייה #{formatSupportInquiryReference(inquiry.referenceNumber)} · {inquiry.categoryLabel}
      </p>
      <p className={ic.introCardMeta}>
        <strong>{inquiry.subject}</strong>
        {createdLabel ? ` · ${createdLabel}` : ""}
      </p>
      <p className={ic.introCardMeta}>
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
        <p className={ic.introCardMeta}>הלקוח סימן שהבעיה נפתרה — אפשר לסגור או להמשיך לענות.</p>
      ) : null}
    </div>
  );
}
