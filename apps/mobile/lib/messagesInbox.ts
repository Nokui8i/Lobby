import {
  compareByUnreadThenUpdatedMs,
  firestoreTimestampToMillis,
  supportInquiryIsOpen,
} from '@lobby/shared';
import type { ChatThreadSummary } from './firebase/chat';
import type { SupportInquirySummary } from './firebase/supportInquiryThread';

export type MessagesInboxRow =
  | { kind: 'chat'; id: string; updatedAtMs: number; chat: ChatThreadSummary }
  | { kind: 'support'; id: string; updatedAtMs: number; support: SupportInquirySummary };

function rowUnreadCount(row: MessagesInboxRow): number {
  if (row.kind === 'chat') {
    return row.chat.unreadForViewer ?? 0;
  }
  if (!supportInquiryIsOpen(row.support.status)) {
    return 0;
  }
  return row.support.unreadForUser ?? 0;
}

export function mergeMessagesInboxRows(
  chats: ChatThreadSummary[],
  support: SupportInquirySummary[],
): MessagesInboxRow[] {
  const rows: MessagesInboxRow[] = [
    ...chats.map((chat) => ({
      kind: 'chat' as const,
      id: chat.id,
      updatedAtMs: firestoreTimestampToMillis(chat.updatedAt),
      chat,
    })),
    ...support.map((inquiry) => ({
      kind: 'support' as const,
      id: inquiry.id,
      updatedAtMs: firestoreTimestampToMillis(inquiry.updatedAt),
      support: inquiry,
    })),
  ];
  rows.sort((a, b) =>
    compareByUnreadThenUpdatedMs(rowUnreadCount(a), rowUnreadCount(b), a.updatedAtMs, b.updatedAtMs),
  );
  return rows;
}

export function messagesInboxUnreadTotal(chats: ChatThreadSummary[], support: SupportInquirySummary[]): number {
  const chatUnread = chats.reduce((acc, t) => acc + (t.unreadForViewer ?? 0), 0);
  const supportUnread = support.reduce((acc, i) => {
    if (!supportInquiryIsOpen(i.status)) {
      return acc;
    }
    return acc + (i.unreadForUser ?? 0);
  }, 0);
  return chatUnread + supportUnread;
}
