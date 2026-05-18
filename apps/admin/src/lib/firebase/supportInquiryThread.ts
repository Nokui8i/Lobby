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
  writeBatch,
} from "firebase/firestore";
import {
  SUPPORT_INQUIRIES_COLLECTION,
  SUPPORT_INQUIRY_MESSAGE_MAX,
  isValidSupportInquiryCategory,
  normalizeSupportInquiryStatus,
  supportInquiryCategoryLabel,
  type SupportInquiryRecord,
  type SupportInquirySenderRole,
} from "@lobby/shared";

const SUPPORT_MESSAGE_PREVIEW_MAX = 140;

function supportMessagePreview(text: string): string {
  return text.trim().slice(0, SUPPORT_MESSAGE_PREVIEW_MAX);
}

export interface AdminSupportMessageRow {
  id: string;
  senderId: string;
  senderRole: SupportInquirySenderRole;
  text: string;
  createdAt: unknown;
}

function mapInquiryDoc(docSnap: DocumentSnapshot): SupportInquiryRecord | null {
  if (!docSnap.exists()) {
    return null;
  }
  const data = docSnap.data();
  const categoryRaw = typeof data.category === "string" ? data.category : "other";
  const category = isValidSupportInquiryCategory(categoryRaw) ? categoryRaw : "other";
  const referenceNumber =
    typeof data.referenceNumber === "number" && data.referenceNumber > 0
      ? Math.floor(data.referenceNumber)
      : 0;

  const toIso = (value: unknown): string => {
    if (!value) {
      return "";
    }
    if (typeof value === "object" && value !== null && "toDate" in value && typeof (value as { toDate: () => Date }).toDate === "function") {
      return (value as { toDate: () => Date }).toDate().toISOString();
    }
    return typeof value === "string" ? value : "";
  };

  return {
    id: docSnap.id,
    referenceNumber,
    userId: typeof data.userId === "string" ? data.userId : "",
    userEmail: typeof data.userEmail === "string" ? data.userEmail : "",
    displayName: typeof data.displayName === "string" ? data.displayName : "",
    category,
    categoryLabel:
      typeof data.categoryLabel === "string" ? data.categoryLabel : supportInquiryCategoryLabel(category),
    subject: typeof data.subject === "string" ? data.subject : "",
    listingId: typeof data.listingId === "string" ? data.listingId : "",
    listingTitle: typeof data.listingTitle === "string" ? data.listingTitle : "",
    status: normalizeSupportInquiryStatus(data.status),
    lastMessagePreview: typeof data.lastMessagePreview === "string" ? data.lastMessagePreview : "",
    lastMessageSenderRole:
      data.lastMessageSenderRole === "staff"
        ? "staff"
        : data.lastMessageSenderRole === "user"
          ? "user"
          : "",
    unreadForUser: typeof data.unreadForUser === "number" ? Math.max(0, data.unreadForUser) : 0,
    unreadForStaff: typeof data.unreadForStaff === "number" ? Math.max(0, data.unreadForStaff) : 0,
    userResolvedAt: toIso(data.userResolvedAt),
    assignedToUid: typeof data.assignedToUid === "string" ? data.assignedToUid : "",
    assignedToDisplayName: typeof data.assignedToDisplayName === "string" ? data.assignedToDisplayName : "",
    staffNote: typeof data.staffNote === "string" ? data.staffNote : "",
    closedByUid: typeof data.closedByUid === "string" ? data.closedByUid : "",
    closedByRole:
      data.closedByRole === "staff" ? "staff" : data.closedByRole === "user" ? "user" : "",
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt),
    closedAt: toIso(data.closedAt),
  };
}

export async function getAdminSupportInquiry(
  db: Firestore,
  inquiryId: string,
): Promise<SupportInquiryRecord | null> {
  const snap = await getDoc(doc(db, SUPPORT_INQUIRIES_COLLECTION, inquiryId));
  return mapInquiryDoc(snap);
}

export function subscribeAdminSupportInquiry(
  db: Firestore,
  inquiryId: string,
  onInquiry: (row: SupportInquiryRecord | null) => void,
): () => void {
  return onSnapshot(doc(db, SUPPORT_INQUIRIES_COLLECTION, inquiryId), (snap) => {
    onInquiry(mapInquiryDoc(snap));
  });
}

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

/** כל הפניות — מנוי חי לרשימת צוות */
export function subscribeAdminSupportInquiries(
  db: Firestore,
  onRows: (rows: SupportInquiryRecord[]) => void,
  onError?: (error: Error) => void,
): () => void {
  const inquiriesQuery = query(
    collection(db, SUPPORT_INQUIRIES_COLLECTION),
    orderBy("updatedAt", "desc"),
  );

  return onSnapshot(
    inquiriesQuery,
    (snapshot) => {
      const rows: SupportInquiryRecord[] = [];
      for (const docSnap of snapshot.docs) {
        const mapped = mapInquiryDoc(docSnap);
        if (mapped) {
          rows.push(mapped);
        }
      }
      onRows(rows);
    },
    (error) => {
      onError?.(error);
    },
  );
}

export function subscribeAdminSupportMessages(
  db: Firestore,
  inquiryId: string,
  onMessages: (rows: AdminSupportMessageRow[]) => void,
): () => void {
  const messagesQuery = query(
    collection(db, SUPPORT_INQUIRIES_COLLECTION, inquiryId, "messages"),
    orderBy("createdAt", "asc"),
  );
  return onSnapshot(messagesQuery, (snapshot) => {
    const rows: AdminSupportMessageRow[] = snapshot.docs.map((messageDoc) => {
      const messageData = messageDoc.data();
      return {
        id: messageDoc.id,
        senderId: typeof messageData.senderId === "string" ? messageData.senderId : "",
        senderRole: messageData.senderRole === "staff" ? "staff" : "user",
        text: typeof messageData.text === "string" ? messageData.text : "",
        createdAt: messageData.createdAt,
      };
    });
    onMessages(rows);
  });
}
