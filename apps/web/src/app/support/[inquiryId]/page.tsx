import { accountMessagesThreadPath, buildSupportChatRouteId } from "@lobby/shared";
import { redirect } from "next/navigation";

interface SupportInquiryRedirectProps {
  params: Promise<{ inquiryId: string }>;
}

export default async function SupportInquiryRedirect({ params }: SupportInquiryRedirectProps) {
  const { inquiryId } = await params;
  redirect(accountMessagesThreadPath(buildSupportChatRouteId(inquiryId)));
}
