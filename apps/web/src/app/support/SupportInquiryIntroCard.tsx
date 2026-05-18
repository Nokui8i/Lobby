import { formatChatMessageTime, formatSupportInquiryReference, type SupportInquiryRecord } from "@lobby/shared";
import styles from "../chat/chat.module.css";

type IntroInquiry = Pick<
  SupportInquiryRecord,
  "referenceNumber" | "categoryLabel" | "subject" | "listingTitle" | "userResolvedAt"
> & {
  createdAt?: unknown;
};

export function SupportInquiryIntroCard({ inquiry }: { inquiry: IntroInquiry }) {
  const createdLabel = inquiry.createdAt ? formatChatMessageTime(inquiry.createdAt) : "";

  return (
    <div
      className={styles.bubbleOther}
      style={{
        alignSelf: "flex-start",
        maxWidth: "92%",
        padding: "14px 16px",
        borderRadius: 14,
        border: "1px solid rgba(8, 184, 200, 0.35)",
        background: "linear-gradient(135deg, rgba(8, 184, 200, 0.08), rgba(8, 184, 200, 0.02))",
      }}
      role="article"
      aria-label="פרטי הפנייה"
    >
      <p style={{ margin: "0 0 6px", fontWeight: 900, fontSize: 14 }}>
        פנייה #{formatSupportInquiryReference(inquiry.referenceNumber)} · {inquiry.categoryLabel}
      </p>
      <p style={{ margin: 0, fontSize: 13, color: "#5c6670", lineHeight: 1.45 }}>
        <strong>{inquiry.subject}</strong>
        {createdLabel ? ` · ${createdLabel}` : ""}
        {inquiry.listingTitle ? ` · ${inquiry.listingTitle}` : ""}
      </p>
      {inquiry.userResolvedAt ? (
        <p style={{ margin: "8px 0 0", fontSize: 13, fontWeight: 700 }}>סימנתם שהבעיה נפתרה — הצוות עדיין יכול לענות.</p>
      ) : null}
    </div>
  );
}
