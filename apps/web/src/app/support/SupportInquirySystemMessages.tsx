import { buildSupportInquiryThreadSystemLines, type SupportInquirySystemIntroInput } from "@lobby/shared";
import { ChatSystemMessage } from "@/components/messaging/chat-ui";

export function SupportInquirySystemMessages({ inquiry }: { inquiry: SupportInquirySystemIntroInput }) {
  const lines = buildSupportInquiryThreadSystemLines(inquiry);

  return (
    <>
      {lines.map((text, index) => (
        <ChatSystemMessage key={`${index}-${text.slice(0, 24)}`}>{text}</ChatSystemMessage>
      ))}
    </>
  );
}
