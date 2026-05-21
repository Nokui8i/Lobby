import { formatChatMessageTime, formatSupportInquiryReference, type SupportInquiryRecord } from "@lobby/shared";

type IntroInquiry = Pick<
  SupportInquiryRecord,
  "referenceNumber" | "categoryLabel" | "subject" | "listingTitle" | "userResolvedAt"
> & {
  createdAt?: unknown;
};

export function SupportInquiryIntroCard({ inquiry }: { inquiry: IntroInquiry }) {
  const createdLabel = inquiry.createdAt ? formatChatMessageTime(inquiry.createdAt) : "";

  return (
    <article
      className="max-w-[92%] self-start rounded-2xl border border-brand/30 bg-gradient-to-br from-brand/10 to-brand/5 px-4 py-3.5 shadow-float"
      aria-label="פרטי הפנייה"
    >
      <p className="mb-1.5 text-sm font-black text-graphite">
        פנייה #{formatSupportInquiryReference(inquiry.referenceNumber)} · {inquiry.categoryLabel}
      </p>
      <p className="m-0 text-[13px] leading-snug text-[#5c6670]">
        <strong className="font-bold text-graphite">{inquiry.subject}</strong>
        {createdLabel ? ` · ${createdLabel}` : ""}
        {inquiry.listingTitle ? ` · ${inquiry.listingTitle}` : ""}
      </p>
      {inquiry.userResolvedAt ? (
        <p className="mt-2 mb-0 text-[13px] font-bold text-graphite">
          סימנתם שהבעיה נפתרה — הצוות עדיין יכול לענות.
        </p>
      ) : null}
    </article>
  );
}
