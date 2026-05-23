import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  buildSupportChatRouteId,
  DELETE_ALL_NOTIFICATIONS_CONFIRM,
  DELETE_ONE_NOTIFICATION_CONFIRM,
  formatChatMessageTime,
  formatNotificationBodyForDisplay,
  isMessagingNotificationKind,
  resolveLobbyNotificationNavigation,
  type LobbyInAppNotification,
} from "@lobby/shared";
import { getFirestoreDb } from "./lib/firebase/client";
import { isFirebaseConfigured } from "./lib/firebase/isConfigured";
import {
  deleteAllMyNotifications,
  deleteMyNotification,
  markAllNotificationsRead,
  markNotificationRead,
  subscribeMyNotifications,
} from "./lib/firebase/notifications";
import { LobbyConfirmModal } from "./components/LobbyConfirmModal";
import { ListingSidebarBannersSection } from "./components/ListingSidebarBannersSection";
import { useLobbyAuth } from "./lib/LobbyAuthContext";

export function NotificationsScreen({
  onClose,
  onOpenThread,
  onOpenListing,
  onEditListing,
  onOpenAccount,
  onOpenContact,
  onOpenSupport,
}: {
  onClose: () => void;
  onOpenThread: (threadId: string) => void;
  onOpenListing: (listingId: string) => void;
  onEditListing: (listingId: string) => void;
  onOpenAccount: () => void;
  onOpenContact?: () => void;
  onOpenSupport?: (inquiryId: string) => void;
}) {
  const { user, loading, openAuthModal } = useLobbyAuth();
  const [items, setItems] = useState<LobbyInAppNotification[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);
  const [pendingDeleteOneId, setPendingDeleteOneId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

  const visibleItems = useMemo(
    () => items.filter((n) => !isMessagingNotificationKind(n.kind)),
    [items],
  );
  const unreadIds = useMemo(() => visibleItems.filter((n) => !n.read).map((n) => n.id), [visibleItems]);
  const allIds = useMemo(() => visibleItems.map((n) => n.id), [visibleItems]);
  const unreadCount = unreadIds.length;

  const confirmDeleteAll = useCallback(() => {
    if (allIds.length === 0 || deletingAll) {
      return;
    }
    Alert.alert(DELETE_ALL_NOTIFICATIONS_CONFIRM.title, DELETE_ALL_NOTIFICATIONS_CONFIRM.body, [
      { text: "ביטול", style: "cancel" },
      {
        text: DELETE_ALL_NOTIFICATIONS_CONFIRM.confirmLabel,
        style: "default",
        onPress: () => {
          setDeletingAll(true);
          void deleteAllMyNotifications(allIds).finally(() => setDeletingAll(false));
        },
      },
    ]);
  }, [allIds, deletingAll]);

  const handleConfirmDeleteOne = useCallback(() => {
    if (!pendingDeleteOneId || deletingId) {
      return;
    }
    const id = pendingDeleteOneId;
    setDeletingId(id);
    void deleteMyNotification(id)
      .then(() => setPendingDeleteOneId(null))
      .finally(() => setDeletingId(null));
  }, [deletingId, pendingDeleteOneId]);

  const handleOpen = useCallback(
    (item: LobbyInAppNotification) => {
      if (!item.read) {
        void markNotificationRead(item.id);
        return;
      }
      const nav = resolveLobbyNotificationNavigation(item);
      if (!nav) {
        return;
      }
      if (nav.type === "chat") {
        onOpenThread(nav.threadId);
        return;
      }
      if (nav.type === "account") {
        onOpenAccount();
        return;
      }
      if (nav.type === "publish") {
        onEditListing(nav.listingId);
        return;
      }
      if (nav.type === "support") {
        onOpenThread(buildSupportChatRouteId(nav.inquiryId));
        return;
      }
      if (nav.type === "contact") {
        onOpenContact?.();
        return;
      }
      onOpenListing(nav.listingId);
    },
    [onOpenAccount, onOpenContact, onOpenSupport, onOpenListing, onEditListing, onOpenThread],
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
        {visibleItems.length > 0 ? (
          <View style={styles.topActions}>
            {unreadCount > 0 ? (
              <Pressable
                onPress={() => {
                  if (markingAll || deletingAll) {
                    return;
                  }
                  setMarkingAll(true);
                  void markAllNotificationsRead(unreadIds).finally(() => setMarkingAll(false));
                }}
                accessibilityRole="button"
                disabled={markingAll || deletingAll}
              >
                <Text style={styles.topMarkAll}>{markingAll ? "מסמן…" : "סמן הכל"}</Text>
              </Pressable>
            ) : null}
            <Pressable
              onPress={confirmDeleteAll}
              accessibilityRole="button"
              disabled={deletingAll || markingAll}
            >
              <Text style={styles.topDeleteAll}>{deletingAll ? "מוחק…" : "מחק הכל"}</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.topSpacer} />
        )}
      </View>
      <View style={styles.bodyRow}>
        <View style={styles.bannerSide}>
          <ListingSidebarBannersSection maxCardWidth={128} />
        </View>
        <View style={styles.panel}>
          <ScrollView
            style={styles.panelScroll}
            contentContainerStyle={styles.scroll}
            bounces
            showsVerticalScrollIndicator
            nestedScrollEnabled
          >
            {listLoading && visibleItems.length === 0 ? <Text style={styles.muted}>טוען…</Text> : null}
            {!listLoading && visibleItems.length === 0 ? <Text style={styles.muted}>אין עדכונים.</Text> : null}
            {visibleItems.map((item) => {
              const timeLabel = item.createdAtMs > 0 ? formatChatMessageTime(item.createdAtMs) : "";
              const bodyText = formatNotificationBodyForDisplay(item);
              const deleting = deletingId === item.id;
              return (
                <View
                  key={item.id}
                  style={[styles.row, !item.read && styles.rowUnread, styles.rowWithDelete]}
                >
                  <Pressable
                    style={styles.rowMain}
                    onPress={() => handleOpen(item)}
                    disabled={deleting}
                  >
                    <View style={styles.rowHeader}>
                      <Text style={styles.rowTitle} numberOfLines={2}>
                        {item.title}
                      </Text>
                      {timeLabel ? <Text style={styles.rowTimeInline}>{timeLabel}</Text> : null}
                    </View>
                    {bodyText ? (
                      <Text style={styles.rowBody} numberOfLines={2}>
                        {bodyText}
                      </Text>
                    ) : null}
                  </Pressable>
                  <Pressable
                    style={styles.rowDeleteBtn}
                    onPress={() => {
                      if (deletingId || pendingDeleteOneId) {
                        return;
                      }
                      setPendingDeleteOneId(item.id);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel="מחק התראה"
                    disabled={deleting}
                  >
                    <Text style={styles.rowDeleteIcon}>{deleting ? "…" : "×"}</Text>
                  </Pressable>
                </View>
              );
            })}
          </ScrollView>
        </View>
      </View>
      <LobbyConfirmModal
        visible={pendingDeleteOneId !== null}
        title={DELETE_ONE_NOTIFICATION_CONFIRM.title}
        body={DELETE_ONE_NOTIFICATION_CONFIRM.body}
        confirmLabel={DELETE_ONE_NOTIFICATION_CONFIRM.confirmLabel}
        busy={deletingId !== null}
        onCancel={() => {
          if (deletingId === null) {
            setPendingDeleteOneId(null);
          }
        }}
        onConfirm={handleConfirmDeleteOne}
      />
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
  topAction: { fontSize: 15, fontWeight: "700", color: "#202125", minWidth: 56, textAlign: "right" },
  topActions: { flexDirection: "row", alignItems: "center", gap: 10, minWidth: 56 },
  topMarkAll: { fontSize: 13, fontWeight: "800", color: "#0799a7", textAlign: "left" },
  topDeleteAll: { fontSize: 13, fontWeight: "800", color: "#64748b", textAlign: "left" },
  topTitle: { fontSize: 18, fontWeight: "800", color: "#202125" },
  topSpacer: { minWidth: 56 },
  bodyRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingHorizontal: 8,
    paddingBottom: 12,
  },
  bannerSide: {
    width: 128,
    flexShrink: 0,
    alignItems: "center",
    paddingTop: 4,
  },
  panel: {
    flex: 1,
    minWidth: 0,
    flexShrink: 1,
    maxHeight: 480,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(16,24,32,0.08)",
    backgroundColor: "#fff",
    overflow: "hidden",
  },
  panelScroll: { flexGrow: 0 },
  scroll: { padding: 10, paddingBottom: 16, gap: 8 },
  muted: { textAlign: "right", paddingVertical: 16, fontSize: 15, fontWeight: "700", color: "#64748b" },
  primaryBtn: {
    margin: 20,
    backgroundColor: "#009DE0",
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryBtnText: { color: "#fff", fontWeight: "900", fontSize: 15 },
  row: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(16,24,32,0.08)",
    backgroundColor: "#fff",
    overflow: "hidden",
  },
  rowWithDelete: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  rowMain: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 11,
    paddingHorizontal: 12,
  },
  rowDeleteBtn: {
    width: 36,
    alignItems: "center",
    justifyContent: "center",
    borderLeftWidth: 1,
    borderLeftColor: "rgba(16,24,32,0.08)",
  },
  rowDeleteIcon: {
    fontSize: 20,
    lineHeight: 22,
    fontWeight: "400",
    color: "#94a3b8",
  },
  rowUnread: { borderColor: "rgba(8,184,200,0.28)", backgroundColor: "rgba(232,251,253,0.45)" },
  rowHeader: {
    flexDirection: "row-reverse",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  rowTitle: { flex: 1, textAlign: "right", fontSize: 15, fontWeight: "600", color: "#202125", lineHeight: 20 },
  rowBody: {
    marginTop: 6,
    textAlign: "right",
    fontSize: 13,
    fontWeight: "400",
    color: "#64748b",
    lineHeight: 18,
  },
  rowTimeInline: { fontSize: 11, fontWeight: "500", color: "#8b949b", paddingTop: 2 },
});
