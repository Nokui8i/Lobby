import { MessagesThreadClient } from "../MessagesThreadClient";

interface ChatThreadPageProps {
  params: Promise<{ threadId: string }>;
}

export default async function ChatThreadPage({ params }: ChatThreadPageProps) {
  const { threadId } = await params;

  return <MessagesThreadClient routeId={threadId} />;
}
