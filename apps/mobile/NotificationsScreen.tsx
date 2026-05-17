import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { formatChatMessageTime, type LobbyInAppNotification } from "@lobby/shared";
import { getFirestoreDb } from "./lib/firebase/client";
import { isFirebaseConfigured } from "./lib/firebase/isConfigured";
import {
  markAllNotificationsRead,
  markNotificationRead,
  subscribeMyNotifications,
} from "./lib/firebase/notifications";
import { useLobbyAuth } from "./lib/LobbyAuthContext";

export function NotificationsScreen({
  onClose,
  onOpenThread,
  onOpenListing,
  onOpenAccount,
}: {
  onClose: () => void;
  onOpenThread: (threadId: string) => void;
  onOpenListing: (listingId: string) => void;
  onOpenAccount: () => void;
}) {
  const { user, loading, openAuthModal } = useLobbyAuth();
  const [items, setItems] = useState<LobbyInAppNotification[]>([]);
  const [listLoading, setListLoading] = useState(false);

  useEffect(() => {
    if (!user || !isFirebaseConfigured()) {
      setItems([]);
      return;
    }
    setListLoading(true);
    const unsub = subscribeMyNotifications(
      getFirestoreDb(),
      user.uid,
      (rows) => {
        setItems(rows);
        setListLoading(false);
      },
      () => setListLoading(false),
    );
    return () => unsub();
  }, [user]);

  const unreadIds = useMemo(() => items.filter((n) => !n.read).map((n) => n.id), [items]);
  const unreadCount = unreadIds.length;

  const handleOpen = useCallback(
    (item: LobbyInAppNotification) => {
      if (!item.read) {
        void markNotificationRead(item.id);
      }
      if (item.kind === "chat_message" && item.threadId) {
        onOpenThread(item.threadId);
        return;
      }
      if (item.kind === "listing_expired" || item.kind === "listing_expiring") {
        onOpenAccount();
        return;
      }
      if (item.listingId) {
        onOpenListing(item.listingId);
      }
    },
    [onOpenAccount, onOpenListing, onOpenThread],
  );

  if (!isFirebaseConfigured()) {
    return (
      <SafeAreaView style={styles.root}>
        <StatusBar style="dark" />
        <Text style={styles.muted}>אין חיבור לשרת.</Text>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.root}>
        <StatusBar style="dark" />
        <Text style={styles.muted}>טוען…</Text>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.root}>
        <StatusBar style="dark" />
        <View style={styles.topBar}>
          <Pressable onPress={onClose}>
            <Text style={styles.topAction}>סגירה</Text>
          </Pressable>
          <Text style={styles.topTitle}>התראות</Text>
          <View style={styles.topSpacer} />
        </View>
        <Pressable style={styles.primaryBtn} onPress={openAuthModal}>
          <Text style={styles.primaryBtnText}>כניסה</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar style="dark" />
      <View style={styles.topBar}>
        <Pressable onPress={onClose} accessibilityRole="button">
          <Text style={styles.topAction}>סגירה</Text>
        </Pressable>
        <Text style={styles.topTitle}>התראות</Text>
        {unreadCount > 0 ? (
          <Pressable onPress={() => void markAllNotificationsRead(unreadIds)} accessibilityRole="button">
            <Text style={styles.topMarkAll}>סימון הכל</Text>
          </Pressable>
        ) : (
          <View style={styles.topSpacer} />
        )}
      </View>
      <ScrollView contentContainerStyle={styles.scroll} bounces={false} showsVerticalScrollIndicator={false}>
        {listLoading && items.length === 0 ? <Text style={styles.muted}>טוען…</Text> : null}
        {!listLoading && items.length === 0 ? <Text style={styles.muted}>אין עדכונים.</Text> : null}
        {items.map((item) => {
          const timeLabel = item.createdAtMs > 0 ? formatChatMessageTime(item.createdAtMs) : "";
          return (
            <Pressable
              key={item.id}
              style={[styles.row, !item.read && styles.rowUnread]}
              onPress={() => handleOpen(item)}
            >
              <Text style={styles.rowTitle}>{item.title}</Text>
              <Text style={styles.rowBody}>{item.body}</Text>
              {timeLabel ? <Text style={styles.rowTime}>{timeLabel}</Text> : null}
            </Pressable>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#ffffff" },
  topBar: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e4e5e7",
  },
  topAction: { fontSize: 15, fontWeight: "700", color: "#101820", minWidth: 56, textAlign: "right" },
  topMarkAll: { fontSize: 13, fontWeight: "800", color: "#0799a7", minWidth: 56, textAlign: "left" },
  topTitle: { fontSize: 18, fontWeight: "800", color: "#101820" },
  topSpacer: { minWidth: 56 },
  scroll: { padding: 14, paddingBottom: 28, gap: 10 },
  muted: { textAlign: "right", paddingVertical: 16, fontSize: 15, fontWeight: "700", color: "#687076" },
  primaryBtn: {
    margin: 20,
    backgroundColor: "#101820",
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryBtnText: { color: "#fff", fontWeight: "900", fontSize: 15 },
  row: {
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(16,24,32,0.08)",
    backgroundColor: "#fff",
  },
  rowUnread: { borderColor: "rgba(8,184,200,0.28)", backgroundColor: "rgba(232,251,253,0.45)" },
  rowTitle: { textAlign: "right", fontSize: 15, fontWeight: "800", color: "#101820" },
  rowBody: { marginTop: 6, textAlign: "right", fontSize: 14, fontWeight: "600", color: "#687076" },
  rowTime: { marginTop: 8, textAlign: "right", fontSize: 12, fontWeight: "700", color: "#8b949b" },
});
