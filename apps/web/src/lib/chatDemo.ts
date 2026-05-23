import {
  compareByUnreadThenUpdatedMs,
  firestoreTimestampToMillis,
  getHomeFeedDemoListingById,
  isHomeFeedDemoEnabled,
} from "@lobby/shared";
import type { ChatMessageRow, ChatThreadSummary } from "@/lib/firebase/chat";

export const DEMO_CHAT_THREAD_ID = "demo-chat-thread";
export const DEMO_CHAT_PEER_USER_ID = "demo-publisher";

/** שיחת דמו לעיצוב/בדיקות — מופעלת עם NEXT_PUBLIC_LOBBY_CHAT_DEMO או פיד דמו בית */
export function isChatDemoEnabled(): boolean {
  return (
    process.env.NEXT_PUBLIC_LOBBY_CHAT_DEMO === "true" || isHomeFeedDemoEnabled()
  );
}

export function isChatDemoThreadId(threadId: string): boolean {
  return threadId === DEMO_CHAT_THREAD_ID;
}

function sortThreads(rows: ChatThreadSummary[]): ChatThreadSummary[] {
  return [...rows].sort((a, b) =>
    compareByUnreadThenUpdatedMs(
      a.unreadForViewer ?? 0,
      b.unreadForViewer ?? 0,
      firestoreTimestampToMillis(a.updatedAt),
      firestoreTimestampToMillis(b.updatedAt),
    ),
  );
}

export function buildDemoChatThread(viewerUid: string): ChatThreadSummary {
  const listing = getHomeFeedDemoListingById("demo-feed-1");
  const now = Date.now();

  return {
    id: DEMO_CHAT_THREAD_ID,
    listingId: listing?.id ?? "demo-feed-1",
    listingTitle: listing?.title ?? "דירת 3 חדרים מוארת — רמת אביב",
    participantIds: [viewerUid, DEMO_CHAT_PEER_USER_ID].sort(),
    updatedAt: now - 15 * 60 * 1000,
    lastMessagePreview: "מצוין, אז ביום ראשון ב-17:00?",
    lastMessageAt: now - 15 * 60 * 1000,
    lastMessageSenderId: DEMO_CHAT_PEER_USER_ID,
    unreadForViewer: 1,
  };
}

export function getDemoChatMessages(viewerUid: string): ChatMessageRow[] {
  const now = Date.now();
  const hour = 60 * 60 * 1000;

  const seeds: { offsetMs: number; senderId: string; text: string }[] = [
    {
      offsetMs: -48 * hour,
      senderId: DEMO_CHAT_PEER_USER_ID,
      text: "שלום! ראיתי שאתם מתעניינים במודעה. אשמח לענות על שאלות.",
    },
    {
      offsetMs: -47 * hour,
      senderId: viewerUid,
      text: "היי, הדירה עדיין פנויה? אפשר לתאם סיור?",
    },
    {
      offsetMs: -30 * hour,
      senderId: DEMO_CHAT_PEER_USER_ID,
      text: "כן, עדיין פנויה. סיורים בימים א׳–ה׳ בין 17:00 ל-20:00.",
    },
    {
      offsetMs: -22 * hour,
      senderId: viewerUid,
      text: "מעולה. יש חניה בבניין?",
    },
    {
      offsetMs: -20 * hour,
      senderId: DEMO_CHAT_PEER_USER_ID,
      text: "יש מקום אורח אחד — רישום דרך הוועד בית.",
    },
    {
      offsetMs: -4 * hour,
      senderId: viewerUid,
      text: "סבבה, אפשר ביום ראשון?",
    },
    {
      offsetMs: -15 * 60 * 1000,
      senderId: DEMO_CHAT_PEER_USER_ID,
      text: "מצוין, אז ביום ראשון ב-17:00?",
    },
  ];

  return seeds.map((seed, index) => ({
    id: `demo-msg-${index + 1}`,
    senderId: seed.senderId,
    text: seed.text,
    createdAt: now + seed.offsetMs,
  }));
}

export function mergeChatThreadsWithDemo(
  threads: ChatThreadSummary[],
  viewerUid: string,
): ChatThreadSummary[] {
  if (!isChatDemoEnabled() || !viewerUid) {
    return threads;
  }
  if (threads.some((t) => t.id === DEMO_CHAT_THREAD_ID)) {
    return threads;
  }
  return sortThreads([buildDemoChatThread(viewerUid), ...threads]);
}
