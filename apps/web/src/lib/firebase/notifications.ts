import type { Firestore } from "firebase/firestore";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import {
  NOTIFICATIONS_COLLECTION,
  notificationFromFirestorePayload,
  type LobbyInAppNotification,
} from "@lobby/shared";
import { getFirestoreDb } from "./client";

export async function createChatMessageNotification(
  db: Firestore,
  params: {
    recipientUserId: string;
    senderUserId: string;
    senderDisplayName: string;
    threadId: string;
    listingId: string;
    listingTitle: string;
    messagePreview: string;
  },
): Promise<void> {
  const preview = params.messagePreview.trim().slice(0, 140);
  const senderName = params.senderDisplayName.trim() || "משתמש";

  await addDoc(collection(db, NOTIFICATIONS_COLLECTION), {
    userId: params.recipientUserId,
    fromUserId: params.senderUserId,
    kind: "chat_message",
    title: `הודעה חדשה — ${params.listingTitle}`,
    body: `${senderName}: ${preview}`,
    read: false,
    threadId: params.threadId,
    listingId: params.listingId,
    createdAt: serverTimestamp(),
  });
}

export function subscribeMyNotifications(
  db: Firestore,
  userId: string,
  onData: (rows: LobbyInAppNotification[]) => void,
  onError?: (error: Error) => void,
): () => void {
  const q = query(
    collection(db, NOTIFICATIONS_COLLECTION),
    where("userId", "==", userId),
    orderBy("createdAt", "desc"),
    limit(80),
  );

  return onSnapshot(
    q,
    (snap) => {
      const rows: LobbyInAppNotification[] = [];
      for (const docSnap of snap.docs) {
        const mapped = notificationFromFirestorePayload(
          docSnap.id,
          docSnap.data() as Record<string, unknown>,
        );
        if (mapped) {
          rows.push(mapped);
        }
      }
      rows.sort((a, b) => b.createdAtMs - a.createdAtMs);
      onData(rows);
    },
    (err) => {
      onError?.(err);
    },
  );
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  const db = getFirestoreDb();
  await updateDoc(doc(db, NOTIFICATIONS_COLLECTION, notificationId), { read: true });
}

export async function markAllNotificationsRead(notificationIds: string[]): Promise<void> {
  if (notificationIds.length === 0) {
    return;
  }
  const db = getFirestoreDb();
  const batch = writeBatch(db);
  for (const id of notificationIds) {
    batch.update(doc(db, NOTIFICATIONS_COLLECTION, id), { read: true });
  }
  await batch.commit();
}

const NOTIFICATION_DELETE_BATCH_SIZE = 500;

/** מוחק את כל ההתראות של המשתמש מהרשימה (באצוות Firestore). */
export async function deleteMyNotification(notificationId: string): Promise<void> {
  const db = getFirestoreDb();
  await deleteDoc(doc(db, NOTIFICATIONS_COLLECTION, notificationId));
}

export async function deleteAllMyNotifications(notificationIds: string[]): Promise<void> {
  if (notificationIds.length === 0) {
    return;
  }
  const db = getFirestoreDb();
  for (let offset = 0; offset < notificationIds.length; offset += NOTIFICATION_DELETE_BATCH_SIZE) {
    const chunk = notificationIds.slice(offset, offset + NOTIFICATION_DELETE_BATCH_SIZE);
    const batch = writeBatch(db);
    for (const id of chunk) {
      batch.delete(doc(db, NOTIFICATIONS_COLLECTION, id));
    }
    await batch.commit();
  }
}

export async function saveExpoPushToken(uid: string, token: string): Promise<void> {
  const db = getFirestoreDb();
  await updateDoc(doc(db, "users", uid), {
    expoPushToken: token.trim(),
    pushTokenUpdatedAt: serverTimestamp(),
    pushNotificationsEnabled: true,
    updatedAt: serverTimestamp(),
  });
}

export async function setPushNotificationsEnabled(uid: string, enabled: boolean): Promise<void> {
  const db = getFirestoreDb();
  await updateDoc(doc(db, "users", uid), {
    pushNotificationsEnabled: enabled,
    updatedAt: serverTimestamp(),
  });
}

export async function fetchPushNotificationsEnabled(uid: string): Promise<boolean> {
  const db = getFirestoreDb();
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) {
    return true;
  }
  const v = snap.data()?.pushNotificationsEnabled;
  return v !== false;
}
