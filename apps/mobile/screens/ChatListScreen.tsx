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
} from '@lobby/shared';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import { ImageBackground, Pressable, SafeAreaView, ScrollView, Text, TextInput, View } from 'react-native';
import { LobbyConfirmModal } from '../components/LobbyConfirmModal';
import { FloatingMainTabBar } from '../components/MainTabBar';
import { ThreadRowMenu } from '../components/ThreadRowMenu';
import type { MainTab } from '../navigation/types';
import {
  fetchChatThreadsForUser,
  formatChatThreadsListError,
  subscribeChatThreadsForUser,
  type ChatThreadSummary,
} from '../lib/firebase/chat';
import { getFirestoreDb, ensureFirestoreAuthReady } from '../lib/firebase/client';
import { isFirebaseConfigured } from '../lib/firebase/isConfigured';
import { useLobbyAuth } from '../lib/LobbyAuthContext';
import { subscribeMySupportInquiries, type SupportInquirySummary } from '../lib/firebase/supportInquiryThread';
import { mergeMessagesInboxRows, type MessagesInboxRow } from '../lib/messagesInbox';
import { deleteMyChatThread, deleteMySupportInquiry } from '../lib/firebase/messagesDelete';
import { appStyles } from '../styles/appStyles';

type PendingDelete =
  | { kind: 'chat'; id: string }
  | { kind: 'support'; id: string };

export function ChatListView({
  mainTab,
  messagesBadgeCount,
  onTabPress,
  onOpenThread,
  onClose,
}: {
  mainTab: MainTab;
  messagesBadgeCount: number;
  onTabPress: (tab: MainTab) => void;
  onOpenThread: (threadId: string) => void;
  onClose: () => void;
}) {
  const { user, loading, openAuthModal } = useLobbyAuth();
  const [threads, setThreads] = useState<ChatThreadSummary[]>([]);
  const [supportInquiries, setSupportInquiries] = useState<SupportInquirySummary[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const inboxRows = useMemo(
    () => mergeMessagesInboxRows(threads, supportInquiries),
    [threads, supportInquiries],
  );

  useEffect(() => {
    if (!user) {
      setListLoading(false);
      setThreads([]);
      setSupportInquiries([]);
      setListError(null);
      return;
    }

    if (!isFirebaseConfigured()) {
      setListLoading(false);
      setThreads([]);
      setSupportInquiries([]);
      setListError(null);
      return;
    }

    const db = getFirestoreDb();
    let cancelled = false;
    let unsubscribeChat: (() => void) | undefined;
    let unsubscribeSupport: (() => void) | undefined;

    void (async () => {
      try {
        await ensureFirestoreAuthReady(user);
      } catch {
        /* ignore */
      }

      if (cancelled) {
        return;
      }

      setListLoading(true);
      setListError(null);

      unsubscribeSupport = subscribeMySupportInquiries(
        db,
        user.uid,
        (rows) => {
          if (!cancelled) {
            setSupportInquiries(rows);
            setListLoading(false);
          }
        },
        () => {
          if (!cancelled) {
            setSupportInquiries([]);
          }
        },
      );

      void fetchChatThreadsForUser(db, user.uid)
        .then((rows) => {
          if (!cancelled) {
            setThreads(rows);
            setListLoading(false);
          }
        })
        .catch((err) => {
          if (!cancelled) {
            setListError(formatChatThreadsListError(err));
            setListLoading(false);
          }
        });

      unsubscribeChat = subscribeChatThreadsForUser(
        db,
        user.uid,
        (rows) => {
          if (!cancelled) {
            setThreads(rows);
            setListLoading(false);
            setListError(null);
          }
        },
        (err) => {
          if (!cancelled) {
            setListError(formatChatThreadsListError(err));
            setListLoading(false);
          }
        },
      );
    })();

    return () => {
      cancelled = true;
      unsubscribeChat?.();
      unsubscribeSupport?.();
    };
  }, [user]);

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      return inboxRows;
    }
    return inboxRows.filter((row) => {
      if (row.kind === 'chat') {
        const title = (row.chat.listingTitle || '').toLowerCase();
        const id = (row.chat.listingId || '').toLowerCase();
        return title.includes(q) || id.includes(q);
      }
      const subject = row.support.subject.toLowerCase();
      const ref = formatSupportInquiryReference(row.support.referenceNumber).toLowerCase();
      return subject.includes(q) || ref.includes(q);
    });
  }, [inboxRows, searchQuery]);

  const confirmCopy =
    pendingDelete?.kind === 'support' ? DELETE_SUPPORT_INQUIRY_CONFIRM : DELETE_CHAT_THREAD_CONFIRM;

  async function handleConfirmDelete() {
    if (!user || !pendingDelete || deleting) {
      return;
    }

    setDeleting(true);
    setDeleteError(null);

    try {
      await ensureFirestoreAuthReady(user);
      if (pendingDelete.kind === 'chat') {
        await deleteMyChatThread(pendingDelete.id);
      } else {
        await deleteMySupportInquiry(pendingDelete.id);
      }
      setPendingDelete(null);
    } catch (err) {
      logLobbyError('delete conversation', err);
      setDeleteError(formatLobbySendError(err, 'לא ניתן למחוק את השיחה.'));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <SafeAreaView style={appStyles.chatScreenRoot}>
      <StatusBar style="dark" />
      <View style={appStyles.chatScreenInner}>
        <View style={[appStyles.header, appStyles.chatHeaderBar]}>
          <Pressable style={appStyles.headerAuthAction} accessibilityRole="button" onPress={onClose}>
            <Text style={appStyles.chatHeaderActionText}>סגירה</Text>
          </Pressable>
          <View style={appStyles.logoRow}>
            <Text style={appStyles.chatSectionLabel}>כל השיחות</Text>
          </View>
          <View style={appStyles.headerPublishAction} />
        </View>

        <ScrollView
          style={appStyles.chatListScroll}
          bounces={false}
          alwaysBounceVertical={false}
          overScrollMode="never"
          contentContainerStyle={appStyles.chatListContent}
        >
        {loading ? (
          <Text style={appStyles.chatMuted}>טוען…</Text>
        ) : !user ? (
          <>
            <Text style={appStyles.chatMuted}>התחברו כדי לראות שיחות.</Text>
            <Pressable style={appStyles.chatCta} onPress={openAuthModal}>
              <Text style={appStyles.chatCtaText}>כניסה</Text>
            </Pressable>
          </>
        ) : !isFirebaseConfigured() ? (
          <Text style={appStyles.chatMuted}>אין חיבור לשרת. הגדירו את Firebase כדי לטעון שיחות אמיתיות.</Text>
        ) : (
          <>
            {inboxRows.length > 0 ? (
              <View style={appStyles.chatSearchBar}>
                <TextInput
                  style={appStyles.chatSearchInput}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="חיפוש…"
                  placeholderTextColor="#8b949b"
                  textAlign="right"
                />
              </View>
            ) : null}
            {listLoading ? <Text style={appStyles.chatMuted}>טוען שיחות…</Text> : null}
            {listError ? <Text style={appStyles.chatListError}>{listError}</Text> : null}
            {deleteError ? <Text style={appStyles.chatListError}>{deleteError}</Text> : null}
            {!listLoading && !listError && inboxRows.length === 0 ? (
              <View style={appStyles.chatEmptyWrap}>
                <ImageBackground
                  source={require('./assets/3dicons-chat-bubble-dynamic-color.png')}
                  style={appStyles.chatEmptyArt}
                  imageStyle={appStyles.chatEmptyArtImage}
                  resizeMode="contain"
                  accessibilityElementsHidden
                />
              </View>
            ) : null}
            {filteredRows.map((row) => {
              if (row.kind === 'chat') {
                const thread = row.chat;
                const unread = thread.unreadForViewer ?? 0;
                const timeLabel = thread.lastMessageAt ? formatChatMessageTime(thread.lastMessageAt) : '';
                const previewRaw = thread.lastMessagePreview?.trim() || '';
                const youPrefix =
                  thread.lastMessageSenderId && user && thread.lastMessageSenderId === user.uid ? 'אתם: ' : '';
                const previewLine = previewRaw ? `${youPrefix}${previewRaw}` : 'עדיין אין הודעות';

                return (
                  <View
                    key={`chat-${thread.id}`}
                    style={[
                      appStyles.chatThreadRowShell,
                      unread > 0 ? appStyles.chatThreadRowShellUnread : null,
                    ]}
                  >
                    <Pressable style={appStyles.chatThreadRow} onPress={() => onOpenThread(thread.id)}>
                      <View style={appStyles.chatThreadRowTop}>
                        <View style={appStyles.chatThreadTitleRow}>
                          {unread > 0 ? <View style={appStyles.chatThreadUnreadDot} /> : null}
                          <Text numberOfLines={1} style={appStyles.chatThreadTitle}>
                            {thread.listingTitle || 'שיחה'}
                          </Text>
                        </View>
                        {timeLabel ? <Text style={appStyles.chatThreadTime}>{timeLabel}</Text> : null}
                      </View>
                      <View style={appStyles.chatThreadPreviewRow}>
                        <Text numberOfLines={1} style={appStyles.chatThreadPreview}>
                          {previewLine}
                        </Text>
                        {unread > 0 ? (
                          <View style={appStyles.chatThreadUnreadPill}>
                            <Text style={appStyles.chatThreadUnreadPillText}>
                              {unread > 9 ? '9+' : String(unread)}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                      <Text numberOfLines={1} style={appStyles.chatThreadMeta}>
                        שיחה סביב המודעה
                      </Text>
                    </Pressable>
                    <ThreadRowMenu
                      deleteLabel={DELETE_CHAT_THREAD_CONFIRM.confirmLabel}
                      onDeletePress={() => setPendingDelete({ kind: 'chat', id: thread.id })}
                    />
                  </View>
                );
              }

              const inquiry = row.support;
              const unread = inquiry.unreadForUser ?? 0;
              const timeLabel = inquiry.updatedAt ? formatChatMessageTime(inquiry.updatedAt) : '';
              const routeId = buildSupportChatRouteId(inquiry.id);

              const supportUnread =
                unread > 0 && supportInquiryIsOpen(inquiry.status) ? unread : 0;

              return (
                <View
                  key={`support-${inquiry.id}`}
                  style={[
                    appStyles.chatThreadRowShell,
                    supportUnread > 0 ? appStyles.chatThreadRowShellUnread : null,
                  ]}
                >
                  <Pressable style={appStyles.chatThreadRow} onPress={() => onOpenThread(routeId)}>
                    <View style={appStyles.chatThreadRowTop}>
                      <View style={appStyles.chatThreadTitleRow}>
                        {supportUnread > 0 ? <View style={appStyles.chatThreadUnreadDot} /> : null}
                        <Text numberOfLines={1} style={appStyles.chatThreadTitle}>
                          {inquiry.subject || 'תמיכה'}
                        </Text>
                      </View>
                      {timeLabel ? <Text style={appStyles.chatThreadTime}>{timeLabel}</Text> : null}
                    </View>
                    <View style={appStyles.chatThreadPreviewRow}>
                      <Text numberOfLines={1} style={appStyles.chatThreadPreview}>
                        {inquiry.lastMessagePreview?.trim() || 'פנייה לתמיכה'}
                      </Text>
                      {supportUnread > 0 ? (
                        <View style={appStyles.chatThreadUnreadPill}>
                          <Text style={appStyles.chatThreadUnreadPillText}>
                            {supportUnread > 9 ? '9+' : String(supportUnread)}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                    <Text numberOfLines={1} style={appStyles.chatThreadMeta}>
                      תמיכה · #{formatSupportInquiryReference(inquiry.referenceNumber)} ·{' '}
                      {SUPPORT_INQUIRY_STATUS_LABELS[inquiry.status]}
                    </Text>
                  </Pressable>
                  <ThreadRowMenu
                    deleteLabel={DELETE_SUPPORT_INQUIRY_CONFIRM.confirmLabel}
                    onDeletePress={() => setPendingDelete({ kind: 'support', id: inquiry.id })}
                  />
                </View>
              );
            })}
            {inboxRows.length > 0 && searchQuery.trim() && filteredRows.length === 0 ? (
              <Text style={appStyles.chatMuted}>אין תוצאות לחיפוש.</Text>
            ) : null}
          </>
        )}
      </ScrollView>
        <FloatingMainTabBar
          activeTab={mainTab}
          messagesBadgeCount={messagesBadgeCount}
          onTabPress={onTabPress}
        />
      </View>
      <LobbyConfirmModal
        visible={pendingDelete !== null}
        title={confirmCopy.title}
        body={confirmCopy.body}
        confirmLabel={confirmCopy.confirmLabel}
        destructive
        busy={deleting}
        onCancel={() => {
          if (!deleting) {
            setPendingDelete(null);
          }
        }}
        onConfirm={() => void handleConfirmDelete()}
      />
    </SafeAreaView>
  );
}
