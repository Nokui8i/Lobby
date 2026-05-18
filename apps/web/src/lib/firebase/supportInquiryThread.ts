import type { DocumentSnapshot, Firestore } from "firebase/firestore";
import {
  collection,
  doc,
  getDoc,
  deleteField,
  increment,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where,
  writeBatch,
} from "firebase/firestore";
import {
  SUPPORT_INQUIRIES_COLLECTION,
  SUPPORT_INQUIRY_MESSAGE_MAX,
  compareByUnreadThenUpdatedMs,
  firestoreTimestampToMillis,
  normalizeSupportInquiryStatus,
  type SupportInquiryRecord,
  type SupportInquirySenderRole,
} from "@lobby/shared";

const SUPPORT_MESSAGE_PREVIEW_MAX = 140;

function supportMessagePreview(text: string): string {
  return text.trim().slice(0, SUPPORT_MESSAGE_PREVIEW_MAX);
}

export interface SupportInquiryMessageRow {
  id: string;
  senderId: string;
  senderRole: SupportInquirySenderRole;
  text: string;
  createdAt: unknown;
}

export type SupportInquirySummary = Pick<
  SupportInquiryRecord,
  | "id"
  | "referenceNumber"
  | "subject"
  | "categoryLabel"
  | "status"
  | "lastMessagePreview"
  | "unreadForUser"
  | "listingId"
  | "listingTitle"
  | "userResolvedAt"
> & {
  updatedAt: unknown;
  createdAt: unknown;
};

function mapInquiryDoc(docSnap: DocumentSnapshot): SupportInquirySummary | null {
  const data = docSnap.data();
  if (!data) {
    return null;
  }
  const referenceNumber =
    typeof data.referenceNumber === "number" && data.referenceNumber > 0
      ? Math.floor(data.referenceNumber)
      : 0;
  return {
    id: docSnap.id,
    referenceNumber,
    subject: typeof data.subject === "string" ? data.subject : "",
    categoryLabel: typeof data.categoryLabel === "string" ? data.categoryLabel : "",
    status: normalizeSupportInquiryStatus(data.status),
    lastMessagePreview:
      typeof data.lastMessagePreview === "string" ? data.lastMessagePreview : "",
    unreadForUser: typeof data.unreadForUser === "number" ? Math.max(0, data.unreadForUser) : 0,
    listingId: typeof data.listingId === "string" ? data.listingId : "",
    listingTitle: typeof data.listingTitle === "string" ? data.listingTitle : "",
    userResolvedAt:
      typeof data.userResolvedAt === "string"
        ? data.userResolvedAt
        : data.userResolvedAt && typeof data.userResolvedAt === "object" && "toDate" in data.userResolvedAt
          ? (data.userResolvedAt as { toDate: () => Date }).toDate().toISOString()
          : "",
    updatedAt: data.updatedAt,
    createdAt: data.createdAt,
  };
}

export async function getSupportInquiryIfOwner(
  db: Firestore,
  inquiryId: string,
  userId: string,
): Promise<SupportInquirySummary | null> {
  const inquiryRef = doc(db, SUPPORT_INQUIRIES_COLLECTION, inquiryId);
  const snap = await getDoc(inquiryRef);
  if (!snap.exists()) {
    return null;
  }
  const data = snap.data();
  if (typeof data.userId !== "string" || data.userId !== userId) {
    return null;
  }
  return mapInquiryDoc(snap);
}

export function subscribeSupportInquiry(
  db: Firestore,
  inquiryId: string,
  onInquiry: (row: SupportInquirySummary | null) => void,
): () => void {
  const inquiryRef = doc(db, SUPPORT_INQUIRIES_COLLECTION, inquiryId);
  return onSnapshot(inquiryRef, (snap) => {
    if (!snap.exists()) {
      onInquiry(null);
      return;
    }
    onInquiry(mapInquiryDoc(snap));
  });
}

export function subscribeSupportInquiryMessages(
  db: Firestore,
  inquiryId: string,
  onMessages: (rows: SupportInquiryMessageRow[]) => void,
): () => void {
  const messagesQuery = query(
    collection(db, SUPPORT_INQUIRIES_COLLECTION, inquiryId, "messages"),
    orderBy("createdAt", "asc"),
  );
  return onSnapshot(messagesQuery, (snapshot) => {
    const rows: SupportInquiryMessageRow[] = snapshot.docs.map((messageDoc) => {
      const messageData = messageDoc.data();
      const senderRole = messageData.senderRole === "staff" ? "staff" : "user";
      return {
        id: messageDoc.id,
        senderId: typeof messageData.senderId === "string" ? messageData.senderId : "",
        senderRole,
        text: typeof messageData.text === "string" ? messageData.text : "",
        createdAt: messageData.createdAt,
      };
    });
    onMessages(rows);
  });
}

export function sortSupportInquiriesByUpdated(rows: SupportInquirySummary[]): SupportInquirySummary[] {
  return [...rows].sort((a, b) =>
    compareByUnreadThenUpdatedMs(
      a.unreadForUser ?? 0,
      b.unreadForUser ?? 0,
      firestoreTimestampToMillis(a.updatedAt),
      firestoreTimestampToMillis(b.updatedAt),
    ),
  );
}

/** רשימת פניות המשתמש — מנוי חי (מיון unread+updated בצד לקוח) */
/** שליחה ישירה ל-Firestore (מהיר מ-callable) */
export async function sendSupportInquiryMessageDirect(
  db: Firestore,
  inquiryId: string,
  senderId: string,
  senderRole: SupportInquirySenderRole,
  text: string,
  staffAssign?: { assignedToUid: string; assignedToDisplayName: string },
): Promise<void> {
  const trimmed = text.trim();
  if (!trimmed || trimmed.length > SUPPORT_INQUIRY_MESSAGE_MAX) {
    throw new Error("INVALID_MESSAGE");
  }

  const inquiryRef = doc(db, SUPPORT_INQUIRIES_COLLECTION, inquiryId);
  const batch = writeBatch(db);
  const msgRef = doc(collection(db, SUPPORT_INQUIRIES_COLLECTION, inquiryId, "messages"));

  batch.set(msgRef, {
    senderId,
    senderRole,
    text: trimmed,
    createdAt: serverTimestamp(),
  });

  const patch: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
    lastMessageAt: serverTimestamp(),
    lastMessagePreview: supportMessagePreview(trimmed),
    lastMessageSenderId: senderId,
    lastMessageSenderRole: senderRole,
  };

  if (senderRole === "staff") {
    patch.unreadForUser = increment(1);
    patch.unreadForStaff = 0;
    if (staffAssign?.assignedToUid) {
      patch.assignedToUid = staffAssign.assignedToUid;
      patch.assignedToDisplayName = staffAssign.assignedToDisplayName;
    }
  } else {
    patch.unreadForStaff = increment(1);
    patch.userResolvedAt = deleteField();
  }

  batch.update(inquiryRef, patch);
  await batch.commit();
}

export function subscribeMySupportInquiries(
  db: Firestore,
  userId: string,
  onRows: (rows: SupportInquirySummary[]) => void,
  onError?: (error: Error) => void,
): () => void {
  const inquiriesQuery = query(
    collection(db, SUPPORT_INQUIRIES_COLLECTION),
    where("userId", "==", userId),
    orderBy("updatedAt", "desc"),
  );

  return onSnapshot(
    inquiriesQuery,
    (snapshot) => {
      const rows: SupportInquirySummary[] = [];
      for (const docSnap of snapshot.docs) {
        const mapped = mapInquiryDoc(docSnap);
        if (mapped) {
          rows.push(mapped);
        }
      }
      onRows(sortSupportInquiriesByUpdated(rows));
    },
    (error) => {
      onError?.(error);
    },
  );
}
