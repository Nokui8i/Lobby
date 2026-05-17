import { formatChatMessageTime } from '@lobby/shared';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import { ImageBackground, Pressable, SafeAreaView, ScrollView, Text, TextInput, View } from 'react-native';
import { FloatingMainTabBar } from '../components/MainTabBar';
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
import { appStyles } from '../styles/appStyles';

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
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!user) {
      setListLoading(false);
      setThreads([]);
      setListError(null);
      return;
    }

    if (!isFirebaseConfigured()) {
      setListLoading(false);
      setThreads([]);
      setListError(null);
      return;
    }

    const db = getFirestoreDb();
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

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

      unsubscribe = subscribeChatThreadsForUser(
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
      unsubscribe?.();
    };
  }, [user]);

  const filteredThreads = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return threads;
    return threads.filter((t) => {
      const title = (t.listingTitle || '').toLowerCase();
      const id = (t.listingId || '').toLowerCase();
      return title.includes(q) || id.includes(q);
    });
  }, [threads, searchQuery]);

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
            {threads.length > 0 ? (
              <View style={appStyles.chatSearchBar}>
                <TextInput
                  style={appStyles.chatSearchInput}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="חיפוש לפי כותרת או מודעה…"
                  placeholderTextColor="#8b949b"
                  textAlign="right"
                />
              </View>
            ) : null}
            {listLoading ? <Text style={appStyles.chatMuted}>טוען שיחות…</Text> : null}
            {listError ? <Text style={appStyles.chatListError}>{listError}</Text> : null}
            {!listLoading && !listError && threads.length === 0 ? (
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
            {filteredThreads.map((thread) => {
              const unread = thread.unreadForViewer ?? 0;
              const timeLabel = thread.lastMessageAt ? formatChatMessageTime(thread.lastMessageAt) : '';
              const previewRaw = thread.lastMessagePreview?.trim() || '';
              const youPrefix =
                thread.lastMessageSenderId && user && thread.lastMessageSenderId === user.uid ? 'אתם: ' : '';
              const previewLine = previewRaw ? `${youPrefix}${previewRaw}` : 'עדיין אין הודעות';

              return (
                <Pressable
                  key={thread.id}
                  style={appStyles.chatThreadRow}
                  onPress={() => onOpenThread(thread.id)}
                >
                  <View style={appStyles.chatThreadRowTop}>
                    <Text numberOfLines={1} style={appStyles.chatThreadTitle}>
                      {thread.listingTitle || 'שיחה'}
                    </Text>
                    {timeLabel ? <Text style={appStyles.chatThreadTime}>{timeLabel}</Text> : null}
                  </View>
                  <View style={appStyles.chatThreadPreviewRow}>
                    <Text numberOfLines={1} style={appStyles.chatThreadPreview}>
                      {previewLine}
                    </Text>
                    {unread > 0 ? (
                      <View style={appStyles.chatThreadUnreadPill}>
                        <Text style={appStyles.chatThreadUnreadPillText}>{unread > 9 ? '9+' : String(unread)}</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text numberOfLines={1} style={appStyles.chatThreadMeta}>
                    שיחה סביב המודעה
                  </Text>
                </Pressable>
              );
            })}
            {threads.length > 0 && searchQuery.trim() && filteredThreads.length === 0 ? (
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
    </SafeAreaView>
  );
}
