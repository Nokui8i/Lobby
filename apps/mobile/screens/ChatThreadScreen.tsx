import Ionicons from '@expo/vector-icons/Ionicons';
import {
  CHAT_MESSAGE_MAX_LENGTH,
  createOptimisticMessageId,
  formatChatMessageTime,
  formatLobbySendError,
  isComposerSendKey,
  logLobbyError,
  parseSupportChatRouteId,
} from '@lobby/shared';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Keyboard,
  type KeyboardEvent,
  NativeScrollEvent,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  getChatThreadIfParticipant,
  markChatThreadRead,
  sendChatMessage,
  subscribeChatMessages,
  type ChatMessageRow,
  type ChatThreadSummary,
} from '../lib/firebase/chat';
import { getFirestoreDb, ensureFirestoreAuthReady } from '../lib/firebase/client';
import { isFirebaseConfigured } from '../lib/firebase/isConfigured';
import { useLobbyAuth } from '../lib/LobbyAuthContext';
import { mergeServerMessagesWithPending, pruneAcknowledgedPending } from '../lib/mergePendingMessages';
import { appStyles } from '../styles/appStyles';
import { SupportThreadView } from './SupportScreens';

export function ChatThreadView({
  threadId,
  onBackToList,
  onClose,
}: {
  threadId: string;
  onBackToList: () => void;
  onClose: () => void;
}) {
  const supportInquiryId = parseSupportChatRouteId(threadId);
  if (supportInquiryId) {
    return (
      <SupportThreadView inquiryId={supportInquiryId} onBack={onBackToList} onClose={onClose} />
    );
  }
  return (
    <ListingChatThreadView threadId={threadId} onBackToList={onBackToList} onClose={onClose} />
  );
}

function ListingChatThreadView({
  threadId,
  onBackToList,
  onClose,
}: {
  threadId: string;
  onBackToList: () => void;
  onClose: () => void;
}) {
  const { user, loading, openAuthModal } = useLobbyAuth();
  const [thread, setThread] = useState<ChatThreadSummary | null | undefined>(undefined);
  const [messages, setMessages] = useState<ChatMessageRow[]>([]);
  const [pendingMessages, setPendingMessages] = useState<ChatMessageRow[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView | null>(null);
  const nearBottomRef = useRef(true);
  const [keyboardPad, setKeyboardPad] = useState(0);

  useEffect(() => {
    if (Platform.OS !== 'ios') {
      return;
    }

    const showEvent = 'keyboardWillShow' as const;
    const hideEvent = 'keyboardWillHide' as const;

    const onShow = (e: KeyboardEvent) => {
      setKeyboardPad(e.endCoordinates.height);
    };
    const onHide = () => {
      setKeyboardPad(0);
    };

    const subShow = Keyboard.addListener(showEvent, onShow);
    const subHide = Keyboard.addListener(hideEvent, onHide);

    return () => {
      subShow.remove();
      subHide.remove();
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setThread(null);
      setMessages([]);
      setPendingMessages([]);
      return;
    }

    if (!isFirebaseConfigured()) {
      setThread(null);
      setMessages([]);
      setPendingMessages([]);
      return;
    }

    setThread(undefined);
    setMessages([]);
    setPendingMessages([]);
    nearBottomRef.current = true;

    let unsubscribe: (() => void) | undefined;
    let cancelled = false;

    void (async () => {
      try {
        await ensureFirestoreAuthReady(user);
      } catch {
        /* ignore */
      }

      if (cancelled) {
        return;
      }

      const summary = await getChatThreadIfParticipant(getFirestoreDb(), threadId, user.uid);

      if (cancelled) {
        return;
      }

      if (!summary) {
        setThread(null);
        return;
      }

      setThread(summary);
      void markChatThreadRead(getFirestoreDb(), threadId, user.uid).catch(() => {});

      unsubscribe = subscribeChatMessages(getFirestoreDb(), threadId, (rows) => {
        setMessages(rows);
        setPendingMessages((pending) => pruneAcknowledgedPending(pending, rows));
      });
    })();

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [threadId, user]);

  const displayMessages = useMemo(
    () => mergeServerMessagesWithPending(messages, pendingMessages),
    [messages, pendingMessages],
  );

  useEffect(() => {
    const last = displayMessages[displayMessages.length - 1];
    if (!last) {
      return;
    }

    if (nearBottomRef.current || last.senderId === user?.uid) {
      scrollRef.current?.scrollToEnd({ animated: true });
    }
  }, [displayMessages, user?.uid]);

  useEffect(() => {
    if (keyboardPad <= 0) {
      return;
    }

    const id = requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    });

    return () => cancelAnimationFrame(id);
  }, [keyboardPad]);

  function handleMessagesScroll(event: { nativeEvent: NativeScrollEvent }) {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const distanceFromBottom = contentSize.height - (contentOffset.y + layoutMeasurement.height);
    nearBottomRef.current = distanceFromBottom < 160;
  }

  async function handleSend() {
    if (!user || !thread || sending) {
      return;
    }

    const text = draft.trim();

    if (!text) {
      return;
    }

    const otherId = thread.participantIds.find((id) => id !== user.uid);
    if (!otherId) {
      return;
    }

    const optimisticId = createOptimisticMessageId();
    const optimistic: ChatMessageRow = {
      id: optimisticId,
      senderId: user.uid,
      text,
      createdAt: Date.now(),
    };

    setDraft('');
    setPendingMessages((prev) => [...prev, optimistic]);
    setSendError(null);
    setSending(true);

    try {
      await ensureFirestoreAuthReady(user);
      await sendChatMessage(getFirestoreDb(), threadId, user.uid, text, {
        otherParticipantId: otherId,
      });
    } catch (err) {
      logLobbyError('chat send', err);
      setPendingMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      setDraft(text);
      setSendError(formatLobbySendError(err, 'לא ניתן לשלוח. נסו שוב.'));
    } finally {
      setSending(false);
    }
  }

  const threadKeyboardBody =
    loading || !user || !isFirebaseConfigured() || thread === undefined || thread === null ? null : (
      <View style={[appStyles.chatThreadBody, { paddingBottom: keyboardPad }]}>
        <Text style={appStyles.chatThreadSubtitle}>{thread.listingTitle}</Text>
        <ScrollView
          ref={scrollRef}
          style={appStyles.chatMessagesScroll}
          contentContainerStyle={appStyles.chatMessagesContent}
          bounces={false}
          alwaysBounceVertical={false}
          overScrollMode="never"
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          onScroll={handleMessagesScroll}
          scrollEventThrottle={16}
        >
          {displayMessages.map((message) => {
            const mine = message.senderId === user.uid;
            const timeLabel = formatChatMessageTime(message.createdAt);
            return (
              <View
                key={message.id}
                style={[appStyles.chatBubbleColumn, mine ? appStyles.chatBubbleColumnMine : appStyles.chatBubbleColumnOther]}
              >
                <View style={[appStyles.chatBubble, mine ? appStyles.chatBubbleMine : appStyles.chatBubbleOther]}>
                  <Text style={appStyles.chatBubbleText}>{message.text}</Text>
                </View>
                {timeLabel ? <Text style={appStyles.chatBubbleTime}>{timeLabel}</Text> : null}
              </View>
            );
          })}
        </ScrollView>
        {sendError ? <Text style={appStyles.chatSendError}>{sendError}</Text> : null}
        <Text style={appStyles.chatLegalNoticeMobile}>
          השיחות לתיאום סביב המודעה בלבד. Lobby אינה צד לעסקה ואינה מנטרת הודעות בזמן אמת.
        </Text>
        <View style={appStyles.chatComposerWrap}>
          <View style={appStyles.chatComposerBar}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="צירוף קבצים"
              style={({ pressed }) => [appStyles.chatComposerIconBtn, pressed && appStyles.chatComposerIconBtnPressed]}
              onPress={() => Alert.alert('בקרוב', 'צירוף תמונות וקבצים יתווסף בהמשך.')}
            >
              <Ionicons name="add" size={26} color="#ffffff" />
            </Pressable>
            <TextInput
              style={appStyles.chatInputBar}
              value={draft}
              onChangeText={setDraft}
              placeholder="כתבו הודעה…"
              placeholderTextColor="#8b949b"
              maxLength={CHAT_MESSAGE_MAX_LENGTH}
              multiline
              textAlign="right"
              blurOnSubmit={false}
              onKeyPress={(event) => {
                const native = event.nativeEvent;
                if (isComposerSendKey(native.key, Boolean(native.shiftKey))) {
                  event.preventDefault();
                  void handleSend();
                }
              }}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="שליחה"
              style={({ pressed }) => [
                appStyles.chatComposerSendBtn,
                (!draft.trim() || sending) && appStyles.chatComposerSendBtnDisabled,
                pressed && draft.trim() && !sending && appStyles.chatComposerSendBtnPressed,
              ]}
              disabled={sending || !draft.trim()}
              onPress={() => void handleSend()}
            >
              <Ionicons
                name="send"
                size={20}
                color={!draft.trim() || sending ? '#c5c9cc' : '#08b8c8'}
              />
            </Pressable>
          </View>
        </View>
      </View>
    );

  return (
    <SafeAreaView style={appStyles.chatScreenRoot}>
      <StatusBar style="dark" />
      <View style={appStyles.chatScreenInner}>
        <View style={[appStyles.header, appStyles.chatHeaderBar]}>
          <Pressable style={appStyles.headerAuthAction} accessibilityRole="button" onPress={onBackToList}>
            <Text style={appStyles.chatHeaderActionText}>לרשימה</Text>
          </Pressable>
          <View style={appStyles.logoRow}>
            <Text style={appStyles.chatScreenTitle}>צ׳אט</Text>
          </View>
          <View style={appStyles.headerPublishAction} />
        </View>

        {loading ? (
          <Text style={appStyles.chatMuted}>טוען…</Text>
        ) : !user ? (
          <>
            <Text style={appStyles.chatMuted}>התחברו לשליחת הודעות.</Text>
            <Pressable style={appStyles.chatCta} onPress={openAuthModal}>
              <Text style={appStyles.chatCtaText}>כניסה</Text>
            </Pressable>
          </>
        ) : !isFirebaseConfigured() ? (
          <Text style={appStyles.chatMuted}>אין חיבור לשרת.</Text>
        ) : thread === undefined ? (
          <Text style={appStyles.chatMuted}>טוען שיחה…</Text>
        ) : thread === null ? (
          <Text style={appStyles.chatMuted}>אין גישה לשיחה.</Text>
        ) : (
          threadKeyboardBody
        )}

      </View>
    </SafeAreaView>
  );
}
