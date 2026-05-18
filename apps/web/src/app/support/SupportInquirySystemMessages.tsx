import { buildSupportInquiryThreadSystemLines, type SupportInquirySystemIntroInput } from "@lobby/shared";
import styles from "../chat/chat.module.css";

export function SupportInquirySystemMessages({ inquiry }: { inquiry: SupportInquirySystemIntroInput }) {
  const lines = buildSupportInquiryThreadSystemLines(inquiry);

  return (
    <>
      {lines.map((text, index) => (
        <div key={`${index}-${text.slice(0, 24)}`} className={styles.bubbleWrapSystem} role="status">
          <p className={styles.bubbleSystem}>{text}</p>
        </div>
      ))}
    </>
  );
}
