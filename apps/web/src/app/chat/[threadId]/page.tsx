import { redirect } from "next/navigation";
import { accountMessagesThreadPath } from "@lobby/shared";

interface ChatLegacyThreadRedirectProps {
  params: Promise<{ threadId: string }>;
}

export default async function ChatLegacyThreadRedirect({ params }: ChatLegacyThreadRedirectProps) {
  const { threadId } = await params;
  redirect(accountMessagesThreadPath(threadId));
}
