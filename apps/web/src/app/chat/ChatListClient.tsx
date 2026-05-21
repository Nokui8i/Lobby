"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Headphones } from "lucide-react";
import {
  DELETE_CHAT_THREAD_CONFIRM,
  DELETE_SUPPORT_INQUIRY_CONFIRM,
  SUPPORT_INQUIRY_STATUS_LABELS,
  buildSupportChatRouteId,
  formatChatMessageTime,
  formatLobbySendError,
  formatSupportInquiryReference,
  logLobbyError,
  supportInquiryIsOpen,
} from "@lobby/shared";
import { LobbyConfirmDialog } from "@/components/LobbyConfirmDialog";
import {
  ChatGate,
  ChatInboxEmpty,
  ChatInboxHeader,
  ChatInboxScroll,
  ChatInboxSearch,
  ChatInboxSkeleton,
  ChatPanelShell,
  ChatStatusBanner,
  ChatThreadList,
  ChatThreadListItem,
} from "@/components/messaging/chat-ui";
import { ThreadCardMenu } from "@/components/messages/ThreadCardMenu";
import { useLobbyAuth } from "@/contexts/LobbyAuthContext";
import { useChatInbox } from "@/contexts/ChatInboxContext";
import { isFirebaseConfigured } from "@/lib/firebase/isConfigured";
import { deleteMyChatThread, deleteMySupportInquiry } from "@/lib/firebase/messagesDelete";
import { ensureFirestoreAuthReady } from "@/lib/firebase/client";

function activeRouteMatches(activeThreadId: string | null | undefined, rowId: string, kind: "chat" | "support") {
  if (!activeThreadId) {
    return false;
  }
  if (kind === "chat") {
    return activeThreadId === rowId;
  }
  return activeThreadId === buildSupportChatRouteId(rowId);
}

type PendingDelete =
  | { kind: "chat"; id: string; title: string }
  | { kind: "support"; id: string; title: string };

export function ChatListClient({ activeThreadId }: { activeThreadId?: string | null }) {
  const router = useRouter();
  const { user, loading, openAuthModal } = useLobbyAuth();
  const { inboxRows, listLoading, listError } = useChatInbox();
  const [searchQuery, setSearchQuery] = useState("");
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      return inboxRows;
    }
    return inboxRows.filter((row) => {
      if (row.kind === "chat") {
        const title = (row.chat.listingTitle || "").toLowerCase();
        const id = (row.chat.listingId || "").toLowerCase();
        return title.includes(q) || id.includes(q);
      }
      const subject = row.support.subject.toLowerCase();
      const ref = formatSupportInquiryReference(row.support.referenceNumber).toLowerCase();
      return subject.includes(q) || ref.includes(q);
    });
  }, [inboxRows, searchQuery]);

  async function handleConfirmDelete() {
    if (!user || !pendingDelete || deleting) {
      return;
    }

    setDeleting(true);
    setDeleteError(null);

    try {
      await ensureFirestoreAuthReady(user);
      if (pendingDelete.kind === "chat") {
        await deleteMyChatThread(pendingDelete.id);
        if (activeRouteMatches(activeThreadId, pendingDelete.id, "chat")) {
          router.push("/chat");
          router.refresh();
        }
      } else {
        await deleteMySupportInquiry(pendingDelete.id);
        if (activeRouteMatches(activeThreadId, pendingDelete.id, "support")) {
          router.push("/chat");
          router.refresh();
        }
      }
      setPendingDelete(null);
    } catch (err) {
      logLobbyError("delete conversation", err);
      setDeleteError(formatLobbySendError(err, "לא ניתן למחוק את השיחה."));
    } finally {
      setDeleting(false);
    }
  }

  const confirmCopy =
    pendingDelete?.kind === "support" ? DELETE_SUPPORT_INQUIRY_CONFIRM : DELETE_CHAT_THREAD_CONFIRM;

  return (
    <ChatGate
      firebaseMissing={!isFirebaseConfigured()}
      loading={loading}
      needsAuth={!user}
      onAuth={openAuthModal}
    >
      <ChatPanelShell>
        <ChatInboxHeader />
        {inboxRows.length > 0 ? <ChatInboxSearch value={searchQuery} onChange={setSearchQuery} /> : null}

        {listLoading ? <ChatInboxSkeleton /> : null}
        {listError ? <ChatStatusBanner variant="error">{listError}</ChatStatusBanner> : null}
        {deleteError ? <ChatStatusBanner variant="error">{deleteError}</ChatStatusBanner> : null}

        {!listLoading && !listError && inboxRows.length === 0 ? <ChatInboxEmpty /> : null}

        <ChatInboxScroll>
          {filteredRows.length > 0 ? (
            <ChatThreadList>
              {filteredRows.map((row) => {
                if (row.kind === "chat") {
                  const thread = row.chat;
                  const active = activeRouteMatches(activeThreadId, thread.id, "chat");
                  const unread = thread.unreadForViewer ?? 0;
                  const timeLabel = thread.lastMessageAt ? formatChatMessageTime(thread.lastMessageAt) : "";
                  const preview = thread.lastMessagePreview;
                  const mine = thread.lastMessageSenderId === user?.uid;
                  const title = thread.listingTitle || "שיחה";

                  return (
                    <ChatThreadListItem
                      key={`chat-${thread.id}`}
                      href={`/chat/${thread.id}`}
                      active={active}
                      unread={unread}
                      title={title}
                      preview={preview ? `${mine ? "אתם: " : ""}${preview}` : undefined}
                      meta="שיחה סביב המודעה"
                      timeLabel={timeLabel}
                      menu={
                        <ThreadCardMenu
                          ariaLabel={`אפשרויות שיחה: ${title}`}
                          deleteLabel={DELETE_CHAT_THREAD_CONFIRM.confirmLabel}
                          onDeleteClick={() => setPendingDelete({ kind: "chat", id: thread.id, title })}
                        />
                      }
                    />
                  );
                }

                const inquiry = row.support;
                const active = activeRouteMatches(activeThreadId, inquiry.id, "support");
                const unread = inquiry.unreadForUser ?? 0;
                const timeLabel = inquiry.updatedAt ? formatChatMessageTime(inquiry.updatedAt) : "";
                const routeId = buildSupportChatRouteId(inquiry.id);
                const title = inquiry.subject || "תמיכה";

                return (
                  <ChatThreadListItem
                    key={`support-${inquiry.id}`}
                    href={`/chat/${routeId}`}
                    active={active}
                    unread={supportInquiryIsOpen(inquiry.status) ? unread : 0}
                    title={title}
                    preview={inquiry.lastMessagePreview}
                    meta={`תמיכה · #${formatSupportInquiryReference(inquiry.referenceNumber)} · ${SUPPORT_INQUIRY_STATUS_LABELS[inquiry.status]}`}
                    timeLabel={timeLabel}
                    icon={Headphones}
                    menu={
                      <ThreadCardMenu
                        ariaLabel={`אפשרויות פנייה: ${title}`}
                        deleteLabel={DELETE_SUPPORT_INQUIRY_CONFIRM.confirmLabel}
                        onDeleteClick={() => setPendingDelete({ kind: "support", id: inquiry.id, title })}
                      />
                    }
                  />
                );
              })}
            </ChatThreadList>
          ) : inboxRows.length > 0 && searchQuery.trim() ? (
            <ChatStatusBanner variant="muted">אין תוצאות לחיפוש.</ChatStatusBanner>
          ) : null}
        </ChatInboxScroll>

        <LobbyConfirmDialog
          open={pendingDelete !== null}
          title={confirmCopy.title}
          body={confirmCopy.body}
          confirmLabel={confirmCopy.confirmLabel}
          variant="destructive"
          busy={deleting}
          onCancel={() => {
            if (!deleting) {
              setPendingDelete(null);
            }
          }}
          onConfirm={() => void handleConfirmDelete()}
        />
      </ChatPanelShell>
    </ChatGate>
  );
}
