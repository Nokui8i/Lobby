import { ChatThreadClient } from "../ChatThreadClient";

interface ChatThreadPageProps {
  params: Promise<{ threadId: string }>;
}

export default async function ChatThreadPage({ params }: ChatThreadPageProps) {
  const { threadId } = await params;

  return <ChatThreadClient threadId={threadId} />;
}
