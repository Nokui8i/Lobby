import { MessagesThreadClient } from "@/app/chat/MessagesThreadClient";

interface AccountMessagesThreadPageProps {
  params: Promise<{ threadId: string }>;
}

export default async function AccountMessagesThreadPage({ params }: AccountMessagesThreadPageProps) {
  const { threadId } = await params;
  return <MessagesThreadClient routeId={threadId} />;
}
