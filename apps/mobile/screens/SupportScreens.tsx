import {
  SUPPORT_INQUIRY_MESSAGE_MAX,
  SUPPORT_INQUIRY_STATUS_LABELS,
  buildSupportInquiryThreadSystemLines,
  createOptimisticMessageId,
  formatLobbySendError,
  formatChatMessageTime,
  logLobbyError,
  formatSupportInquiryReference,
  isComposerSendKey,
  supportInquiryIsOpen,
  type SupportInquiryRecord,
} from "@lobby/shared";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLobbyAuth } from "../lib/LobbyAuthContext";
import {
  markSupportInquiryResolved,
  listMySupportInquiries,
  markSupportInquiryRead,
  sendSupportInquiryMessage,
} from "../lib/firebase/supportInquiry";
import {
  getSupportInquiryIfOwner,
  subscribeSupportInquiry,
  subscribeSupportInquiryMessages,
  type SupportInquiryMessageRow,
  type SupportInquirySummary,
} from "../lib/firebase/supportInquiryThread";
import { getFirestoreDb, ensureFirestoreAuthReady } from "../lib/firebase/client";
import { isFirebaseConfigured } from "../lib/firebase/isConfigured";
import { mergeServerMessagesWithPending, pruneAcknowledgedPending } from "../lib/mergePendingMessages";

export function SupportListView({
  onClose,
  onOpenInquiry,
  onNewInquiry,
}: {
  onClose: () => void;
  onOpenInquiry: (inquiryId: string) => void;
  onNewInquiry: () => void;
}) {
  const { user, loading, openAuthModal } = useLobbyAuth();
  const [inquiries, setInquiries] = useState<SupportInquiryRecord[]>([]);
  const [listLoading, setListLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setInquiries([]);
      return;
    }
    setListLoading(true);
    try {
      setInquiries(await listMySupportInquiries());
    } catch {
      setInquiries([]);
    } finally {
      setListLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Pressable onPress={onClose}>
          <Text style={styles.back}>← חזרה</Text>
        </Pressable>
        <Text style={styles.title}>הפניות שלי</Text>
        <Pressable onPress={onNewInquiry}>
          <Text style={styles.link}>פנייה חדשה</Text>
        </Pressable>
      </View>
      {loading || listLoading ? (
        <ActivityIndicator style={{ marginTop: 24 }} />
      ) : !user ? (
        <Pressable style={styles.primaryBtn} onPress={openAuthModal}>
          <Text style={styles.primaryBtnText}>התחברות</Text>
        </Pressable>
      ) : inquiries.length === 0 ? (
        <Text style={styles.muted}>אין פניות עדיין.</Text>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {inquiries.map((inquiry) => (
            <Pressable key={inquiry.id} style={styles.row} onPress={() => onOpenInquiry(inquiry.id)}>
              <Text style={styles.rowTitle}>{inquiry.subject}</Text>
              <Text style={styles.muted}>
                #{formatSupportInquiryReference(inquiry.referenceNumber)} ·{" "}
                {SUPPORT_INQUIRY_STATUS_LABELS[inquiry.status]}
                {inquiry.unreadForUser > 0 ? ` · ${inquiry.unreadForUser} חדשות` : ""}
              </Text>
              {inquiry.lastMessagePreview ? (
                <Text style={styles.preview} numberOfLines={2}>
                  {inquiry.lastMessagePreview}
                </Text>
              ) : null}
            </Pressable>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

export function SupportThreadView({
  inquiryId,
  onBack,
  onClose,
}: {
  inquiryId: string;
  onBack: () => void;
  onClose: () => void;
}) {
  const { user, loading, openAuthModal } = useLobbyAuth();
  const [inquiry, setInquiry] = useState<SupportInquirySummary | null | undefined>(undefined);
  const [messages, setMessages] = useState<SupportInquiryMessageRow[]>([]);
  const [pendingMessages, setPendingMessages] = useState<SupportInquiryMessageRow[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [closing, setClosing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView | null>(null);

  const isOpen = inquiry ? supportInquiryIsOpen(inquiry.status) : false;

  useEffect(() => {
    if (!user) {
      setInquiry(null);
      setMessages([]);
      setPendingMessages([]);
      return;
    }
    let unsubInquiry: (() => void) | undefined;
    let unsubMessages: (() => void) | undefined;
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
      const db = getFirestoreDb();
      const summary = await getSupportInquiryIfOwner(db, inquiryId, user.uid);
      if (cancelled) {
        return;
      }
      if (!summary) {
        setInquiry(null);
        return;
      }
      setInquiry(summary);
      void markSupportInquiryRead(inquiryId).catch(() => {});
      unsubInquiry = subscribeSupportInquiry(db, inquiryId, (row) => {
        setInquiry(row);
        if (row) {
          void markSupportInquiryRead(inquiryId).catch(() => {});
        }
      });
      unsubMessages = subscribeSupportInquiryMessages(db, inquiryId, (rows) => {
        setMessages(rows);
        setPendingMessages((pending) => pruneAcknowledgedPending(pending, rows));
      });
    })();

    return () => {
      cancelled = true;
      unsubInquiry?.();
      unsubMessages?.();
    };
  }, [inquiryId, user]);

  const displayMessages = useMemo(
    () => mergeServerMessagesWithPending(messages, pendingMessages),
    [messages, pendingMessages],
  );

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [displayMessages]);

  async function handleSend() {
    const text = draft.trim();
    if (!text || !isOpen || !user || sending) {
      return;
    }

    const optimisticId = createOptimisticMessageId();
    const optimistic: SupportInquiryMessageRow = {
      id: optimisticId,
      senderId: user.uid,
      senderRole: "user",
      text,
      createdAt: Date.now(),
    };

    setDraft("");
    setPendingMessages((prev) => [...prev, optimistic]);
    setError(null);
    setSending(true);

    try {
      if (user) {
        await ensureFirestoreAuthReady(user);
      }
      await sendSupportInquiryMessage(inquiryId, text);
    } catch (err) {
      logLobbyError("support send", err);
      setPendingMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      setDraft(text);
      setError(formatLobbySendError(err, "לא ניתן לשלוח."));
    } finally {
      setSending(false);
    }
  }

  async function handleMarkResolved() {
    if (!isOpen || closing) {
      return;
    }
    setClosing(true);
    try {
      await markSupportInquiryResolved(inquiryId);
    } catch {
      setError("לא ניתן לעדכן.");
    } finally {
      setClosing(false);
    }
  }

  if (loading || inquiry === undefined) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator style={{ marginTop: 24 }} />
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.safe}>
        <Pressable style={styles.primaryBtn} onPress={openAuthModal}>
          <Text style={styles.primaryBtnText}>התחברות</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  if (!inquiry) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.muted}>אין גישה לפנייה.</Text>
        <Pressable onPress={onBack}>
          <Text style={styles.link}>חזרה</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Pressable onPress={onBack}>
          <Text style={styles.back}>← רשימה</Text>
        </Pressable>
        <Text style={styles.title} numberOfLines={1}>
          {inquiry.subject}
        </Text>
        {isOpen ? (
          <Pressable onPress={() => void handleMarkResolved()} disabled={closing}>
            <Text style={styles.link}>{closing ? "שומר…" : "הבעיה נפתרה"}</Text>
          </Pressable>
        ) : (
          <Pressable onPress={onClose}>
            <Text style={styles.link}>סגור</Text>
          </Pressable>
        )}
      </View>
      <Text style={styles.muted}>
        #{formatSupportInquiryReference(inquiry.referenceNumber)} ·{" "}
        {SUPPORT_INQUIRY_STATUS_LABELS[inquiry.status]}
      </Text>
      <ScrollView ref={scrollRef} contentContainerStyle={styles.messages} keyboardShouldPersistTaps="handled">
        {buildSupportInquiryThreadSystemLines(inquiry).map((text, index) => (
          <View key={`sys-${index}`} style={styles.systemBubbleWrap}>
            <Text style={styles.systemBubbleText}>{text}</Text>
          </View>
        ))}
        {displayMessages.map((message) => {
          const mine = message.senderRole === "user";
          const timeLabel = formatChatMessageTime(message.createdAt);
          return (
            <View
              key={message.id}
              style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleOther]}
            >
              <Text style={[styles.bubbleText, mine && styles.bubbleTextMine]}>{message.text}</Text>
              {timeLabel ? <Text style={styles.bubbleTime}>{timeLabel}</Text> : null}
            </View>
          );
        })}
      </ScrollView>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {isOpen ? (
        <View style={styles.composer}>
          <TextInput
            style={styles.input}
            value={draft}
            onChangeText={setDraft}
            maxLength={SUPPORT_INQUIRY_MESSAGE_MAX}
            multiline
            placeholder="הודעה…"
            placeholderTextColor="#8a9399"
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
            style={[styles.primaryBtn, (!draft.trim() || sending) && styles.primaryBtnDisabled]}
            disabled={!draft.trim() || sending}
            onPress={() => void handleSend()}
          >
            <Text style={styles.primaryBtnText}>{sending ? "…" : "שליחה"}</Text>
          </Pressable>
        </View>
      ) : (
        <Text style={styles.muted}>הפנייה סגורה. לפנייה חדשה — יצירת קשר.</Text>
      )}

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f7f6f2" },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(16,24,32,0.1)",
    gap: 6,
  },
  back: { fontSize: 15, fontWeight: "800" },
  title: { fontSize: 20, fontWeight: "900" },
  link: { fontSize: 14, fontWeight: "800", color: "#08b8c8" },
  list: { padding: 16, gap: 10 },
  row: {
    padding: 14,
    borderRadius: 14,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "rgba(16,24,32,0.08)",
  },
  rowTitle: { fontSize: 16, fontWeight: "800" },
  preview: { fontSize: 14, color: "#5c676d", marginTop: 4 },
  muted: { fontSize: 14, color: "#5c676d", padding: 16 },
  messages: { padding: 16, gap: 8, flexGrow: 1 },
  systemBubbleWrap: {
    alignSelf: "center",
    maxWidth: "92%",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "rgba(16, 24, 32, 0.06)",
  },
  systemBubbleText: {
    fontSize: 12,
    lineHeight: 18,
    color: "#74767e",
    textAlign: "center",
    fontWeight: "500",
  },
  bubble: { maxWidth: "85%", padding: 10, borderRadius: 12 },
  bubbleMine: { alignSelf: "flex-end", backgroundColor: "#101820" },
  bubbleOther: { alignSelf: "flex-start", backgroundColor: "#fff", borderWidth: 1, borderColor: "rgba(0,0,0,0.08)" },
  bubbleText: { fontSize: 15, color: "#101820" },
  bubbleTextMine: { color: "#fff" },
  bubbleTime: { fontSize: 11, marginTop: 4, opacity: 0.7 },
  bubbleMineText: { color: "#fff" },
  composer: { padding: 12, gap: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "rgba(0,0,0,0.08)" },
  input: {
    borderWidth: 1,
    borderColor: "rgba(16,24,32,0.12)",
    borderRadius: 14,
    padding: 12,
    backgroundColor: "#fff",
    minHeight: 44,
    maxHeight: 120,
  },
  primaryBtn: {
    marginHorizontal: 16,
    backgroundColor: "#101820",
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: "center",
  },
  primaryBtnDisabled: { opacity: 0.5 },
  primaryBtnText: { color: "#fff", fontWeight: "900" },
  error: { color: "#b42318", paddingHorizontal: 16, fontWeight: "700" },
});
