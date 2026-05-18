import type { DocumentSnapshot, Firestore } from "firebase/firestore";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import {
  CHAT_MESSAGE_MAX_LENGTH,
  CHAT_THREADS_COLLECTION,
  buildChatThreadId,
  compareByUnreadThenUpdatedMs,
  firestoreTimestampToMillis,
  isChatThreadHiddenForUser,
} from "@lobby/shared";

const LAST_MESSAGE_PREVIEW_MAX = 140;

export interface ChatThreadSummary {
  id: string;
  listingId: string;
  listingTitle: string;
  participantIds: string[];
  updatedAt: unknown;
  lastMessagePreview?: string;
  lastMessageAt?: unknown;
  lastMessageSenderId?: string;
  unreadForViewer?: number;
}

export interface ChatMessageRow {
  id: string;
  senderId: string;
  text: string;
  createdAt: unknown;
}

function unreadCountForUser(data: Record<string, unknown>, viewerUid: string): number {
  const unread = data.unread;
  if (!unread || typeof unread !== "object") {
    return 0;
  }
  const rec = unread as Record<string, unknown>;
  const v = rec[viewerUid];
  if (typeof v !== "number" || !Number.isFinite(v)) {
    return 0;
  }
  return Math.max(0, Math.floor(v));
}

function mapThreadDoc(docSnap: DocumentSnapshot, viewerUid: string): ChatThreadSummary | null {
  const data = docSnap.data();
  if (!data) {
    return null;
  }
  const participantIds = data.participantIds;

  if (!Array.isArray(participantIds) || !participantIds.every((p) => typeof p === "string")) {
    return null;
  }

  if (isChatThreadHiddenForUser(data.deletedByUids, viewerUid)) {
    return null;
  }

  const lastMessagePreview =
    typeof data.lastMessagePreview === "string" && data.lastMessagePreview.trim()
      ? data.lastMessagePreview.trim()
      : undefined;
  const lastMessageSenderId = typeof data.lastMessageSenderId === "string" ? data.lastMessageSenderId : undefined;

  return {
    id: docSnap.id,
    listingId: typeof data.listingId === "string" ? data.listingId : "",
    listingTitle: typeof data.listingTitle === "string" ? data.listingTitle : "",
    participantIds,
    updatedAt: data.updatedAt,
    lastMessagePreview,
    lastMessageAt: data.lastMessageAt,
    lastMessageSenderId,
    unreadForViewer: unreadCountForUser(data as Record<string, unknown>, viewerUid),
  };
}

export async function createOrGetChatThread(
  db: Firestore,
  params: {
    listingId: string;
    listingTitle: string;
    publisherUserId: string;
    renterUserId: string;
  },
): Promise<string> {
  const { listingId, listingTitle, publisherUserId, renterUserId } = params;

  if (publisherUserId === renterUserId) {
    throw new Error("SELF_CHAT");
  }

  const threadId = buildChatThreadId(listingId, publisherUserId, renterUserId);
  const threadRef = doc(db, CHAT_THREADS_COLLECTION, threadId);
  const existing = await getDoc(threadRef);

  if (existing.exists()) {
    return threadId;
  }

  const participantIds = [publisherUserId, renterUserId].sort();

  await setDoc(threadRef, {
    listingId,
    listingTitle,
    participantIds,
    unread: {
      [publisherUserId]: 0,
      [renterUserId]: 0,
    },
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return threadId;
}

export async function sendChatMessage(
  db: Firestore,
  threadId: string,
  senderId: string,
  text: string,
  options?: { otherParticipantId?: string },
) {
  const trimmed = text.trim();

  if (!trimmed || trimmed.length > CHAT_MESSAGE_MAX_LENGTH) {
    throw new Error("INVALID_MESSAGE");
  }

  const threadRef = doc(db, CHAT_THREADS_COLLECTION, threadId);
  let otherId = options?.otherParticipantId;

  if (!otherId) {
    const threadSnap = await getDoc(threadRef);

    if (!threadSnap.exists()) {
      throw new Error("THREAD_NOT_FOUND");
    }

    const threadData = threadSnap.data();
    const participantIds = threadData.participantIds;

    if (!Array.isArray(participantIds) || !participantIds.includes(senderId)) {
      throw new Error("NOT_PARTICIPANT");
    }

    otherId = participantIds.find((id: string) => id !== senderId);
    if (!otherId || typeof otherId !== "string") {
      throw new Error("NO_PEER");
    }
  }

  const preview = trimmed.slice(0, LAST_MESSAGE_PREVIEW_MAX);

  const batch = writeBatch(db);
  const messagesCol = collection(db, CHAT_THREADS_COLLECTION, threadId, "messages");
  const msgRef = doc(messagesCol);
  batch.set(msgRef, {
    senderId,
    text: trimmed,
    createdAt: serverTimestamp(),
  });

  const threadUpdate: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
    lastMessagePreview: preview,
    lastMessageSenderId: senderId,
    lastMessageAt: serverTimestamp(),
    [`unread.${otherId}`]: increment(1),
    deletedByUids: [],
  };

  batch.update(threadRef, threadUpdate);
  await batch.commit();
}

function sortChatThreadsForViewer(rows: ChatThreadSummary[]): ChatThreadSummary[] {
  return [...rows].sort((a, b) =>
    compareByUnreadThenUpdatedMs(
      a.unreadForViewer ?? 0,
      b.unreadForViewer ?? 0,
      firestoreTimestampToMillis(a.updatedAt),
      firestoreTimestampToMillis(b.updatedAt),
    ),
  );
}

export async function markChatThreadRead(db: Firestore, threadId: string, viewerUid: string): Promise<void> {
  const threadRef = doc(db, CHAT_THREADS_COLLECTION, threadId);
  await updateDoc(threadRef, {
    [`unread.${viewerUid}`]: 0,
  });
}

export function formatChatThreadsListError(error: unknown): string {
  const code =
    error && typeof error === "object" && "code" in error ? String((error as { code: string }).code) : "";

  if (code === "failed-precondition") {
    return "השאילתה ל-Firestore דורשת אינדקס או עדיין נבנית. נסו שוב בעוד דקה או פנו למפתח.";
  }

  if (code === "permission-denied") {
    return "אין הרשאה לטעון שיחות. נסו להתנתק ולהתחבר מחדש.";
  }

  return "לא ניתן לטעון שיחות. נסו שוב.";
}

export async function fetchChatThreadsForUser(db: Firestore, viewerUid: string): Promise<ChatThreadSummary[]> {
  const threadsQuery = query(
    collection(db, CHAT_THREADS_COLLECTION),
    where("participantIds", "array-contains", viewerUid),
  );
  const snapshot = await getDocs(threadsQuery);
  const rows: ChatThreadSummary[] = [];

  for (const docSnap of snapshot.docs) {
    const mapped = mapThreadDoc(docSnap, viewerUid);
    if (mapped) {
      rows.push(mapped);
    }
  }

  return sortChatThreadsForViewer(rows);
}

export function subscribeChatThreadsForUser(
  db: Firestore,
  viewerUid: string,
  onThreads: (rows: ChatThreadSummary[]) => void,
  onError?: (error: Error) => void,
): () => void {
  const threadsQuery = query(
    collection(db, CHAT_THREADS_COLLECTION),
    where("participantIds", "array-contains", viewerUid),
  );

  return onSnapshot(
    threadsQuery,
    (snapshot) => {
      const rows: ChatThreadSummary[] = [];
      for (const docSnap of snapshot.docs) {
        const mapped = mapThreadDoc(docSnap, viewerUid);
        if (mapped) {
          rows.push(mapped);
        }
      }
      onThreads(sortChatThreadsForViewer(rows));
    },
    (error) => {
      onError?.(error);
    },
  );
}

export async function getChatThreadIfParticipant(
  db: Firestore,
  threadId: string,
  userId: string,
): Promise<ChatThreadSummary | null> {
  const threadRef = doc(db, CHAT_THREADS_COLLECTION, threadId);
  const threadSnap = await getDoc(threadRef);

  if (!threadSnap.exists()) {
    return null;
  }

  const mapped = mapThreadDoc(threadSnap, userId);
  if (!mapped || !mapped.participantIds.includes(userId)) {
    return null;
  }

  return mapped;
}

export function subscribeChatMessages(db: Firestore, threadId: string, onMessages: (rows: ChatMessageRow[]) => void) {
  const messagesQuery = query(
    collection(db, CHAT_THREADS_COLLECTION, threadId, "messages"),
    orderBy("createdAt", "asc"),
  );

  return onSnapshot(messagesQuery, (snapshot) => {
    const rows: ChatMessageRow[] = snapshot.docs.map((messageDoc) => {
      const messageData = messageDoc.data();
      return {
        id: messageDoc.id,
        senderId: typeof messageData.senderId === "string" ? messageData.senderId : "",
        text: typeof messageData.text === "string" ? messageData.text : "",
        createdAt: messageData.createdAt,
      };
    });
    onMessages(rows);
  });
}
