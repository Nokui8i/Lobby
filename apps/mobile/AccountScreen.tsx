import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Image,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  formatListingLocationLine,
  LISTING_OWNER_ACTION_BOOST_INFO_HE,
  LISTING_OWNER_ACTION_CONFIRM_HE,
  LISTING_OWNER_ACTION_LABEL_HE,
  LISTING_STATUS_LABEL_HE,
  listingPublishCountdownIsUrgent,
  listingPublishCountdownLabel,
  listingOwnerActionIsDestructive,
  listingOwnerActionsForStatus,
  type ListingOwnerActionId,
  type ListingStatus,
  type RentalListing,
} from "@lobby/shared";
import { fetchMyListingsFromFirestore } from "./lib/firebase/listingQueries";
import {
  deleteOwnerListing,
  freezeOwnerListing,
  markOwnerListingRented,
  renewOwnerListing,
  unfreezeOwnerListing,
} from "./lib/firebase/listingOwnerMutations";
import { isFirebaseConfigured } from "./lib/firebase/isConfigured";
import { useLobbyAuth } from "./lib/LobbyAuthContext";

type AccountTab = "active" | "draft" | "offFeed";

function listingMatchesTab(listing: RentalListing, tab: AccountTab): boolean {
  if (tab === "active") {
    return (
      listing.status === "active" ||
      listing.status === "frozen" ||
      listing.status === "pending_review"
    );
  }
  if (tab === "draft") {
    return listing.status === "draft";
  }
  return listing.status === "expired" || listing.status === "removed" || listing.status === "rented";
}

function statusPillStyle(status: ListingStatus) {
  if (status === "active") {
    return [styles.pill, styles.pillActive];
  }
  if (status === "frozen") {
    return [styles.pill, styles.pillFrozen];
  }
  if (status === "draft") {
    return [styles.pill, styles.pillDraft];
  }
  return [styles.pill, styles.pillOff];
}

type ActionDialog =
  | {
      listing: RentalListing;
      kind: "confirm";
      action: ListingOwnerActionId;
      title: string;
      body: string;
      confirmLabel: string;
      destructive: boolean;
    }
  | { kind: "info"; title: string; body: string; confirmLabel: string }
  | { kind: "error"; title: string; body: string };

export function AccountScreen({
  onClose,
  onOpenListing,
  onEditListing,
  onOpenNotifications,
  onOpenSettings,
  notifUnread = 0,
}: {
  onClose: () => void;
  onOpenListing: (listing: RentalListing) => void;
  onEditListing: (listingId: string) => void;
  onOpenNotifications: () => void;
  onOpenSettings: () => void;
  notifUnread?: number;
}) {
  const { user, loading, openAuthModal } = useLobbyAuth();
  const [tab, setTab] = useState<AccountTab>("active");
  const [rows, setRows] = useState<RentalListing[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState(false);

  const load = useCallback(async () => {
    if (!user || !isFirebaseConfigured()) {
      setRows([]);
      return;
    }
    setListLoading(true);
    setListError(false);
    try {
      const data = await fetchMyListingsFromFirestore(user.uid);
      setRows(data);
    } catch {
      setRows([]);
      setListError(true);
    } finally {
      setListLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => rows.filter((l) => listingMatchesTab(l, tab)), [rows, tab]);
  const [actionBusyId, setActionBusyId] = useState<string | null>(null);
  const [menuListing, setMenuListing] = useState<RentalListing | null>(null);
  const [actionDialog, setActionDialog] = useState<ActionDialog | null>(null);

  const closeActionDialog = useCallback(() => {
    if (!actionBusyId) {
      setActionDialog(null);
    }
  }, [actionBusyId]);

  const runListingMutation = useCallback(
    async (listing: RentalListing, action: ListingOwnerActionId) => {
      if (!user || actionBusyId) {
        return;
      }

      setActionBusyId(listing.id);
      try {
        if (action === "delete") {
          await deleteOwnerListing(listing.id, user.uid);
        } else if (action === "mark_rented") {
          await markOwnerListingRented(listing.id, user.uid);
        } else if (action === "renew") {
          await renewOwnerListing(listing.id, user.uid);
        } else if (action === "freeze") {
          await freezeOwnerListing(listing.id, user.uid);
        } else if (action === "unfreeze") {
          await unfreezeOwnerListing(listing.id, user.uid);
        }
        setActionDialog(null);
        await load();
      } catch (err) {
        const code = err instanceof Error ? err.message : "";
        if (code === "expired") {
          setActionDialog({
            kind: "error",
            title: "לא ניתן להחזיר לפרסום",
            body: "תקופת ה-30 יום הסתיימה. ניתן לחדש מודעה שפגה.",
          });
        } else {
          setActionDialog({
            kind: "error",
            title: "הפעולה נכשלה",
            body: "נסו שוב בעוד רגע.",
          });
        }
      } finally {
        setActionBusyId(null);
      }
    },
    [user, actionBusyId, load],
  );

  const openListingMenu = useCallback((listing: RentalListing) => {
    setMenuListing(listing);
  }, []);

  const closeListingMenu = useCallback(() => {
    setMenuListing(null);
  }, []);

  const pickMenuAction = useCallback(
    (action: ListingOwnerActionId) => {
      if (!menuListing) {
        return;
      }
      const listing = menuListing;
      setMenuListing(null);

      if (action === "view") {
        onOpenListing(listing);
        return;
      }
      if (action === "edit" || action === "continue_publish") {
        onEditListing(listing.id);
        return;
      }
      if (action === "boost") {
        setActionDialog({
          kind: "info",
          title: LISTING_OWNER_ACTION_BOOST_INFO_HE.title,
          body: LISTING_OWNER_ACTION_BOOST_INFO_HE.body,
          confirmLabel: LISTING_OWNER_ACTION_BOOST_INFO_HE.confirmLabel ?? "הבנתי",
        });
        return;
      }

      const confirmCopy = LISTING_OWNER_ACTION_CONFIRM_HE[action];
      if (confirmCopy) {
        setActionDialog({
          listing,
          kind: "confirm",
          action,
          title: confirmCopy.title,
          body: confirmCopy.body,
          confirmLabel: confirmCopy.confirmLabel ?? "אישור",
          destructive: listingOwnerActionIsDestructive(action),
        });
        return;
      }

      void runListingMutation(listing, action);
    },
    [menuListing, onOpenListing, onEditListing, runListingMutation],
  );

  const confirmActionDialog = useCallback(() => {
    if (!actionDialog) {
      return;
    }
    if (actionDialog.kind === "confirm") {
      void runListingMutation(actionDialog.listing, actionDialog.action);
      return;
    }
    setActionDialog(null);
  }, [actionDialog, runListingMutation]);

  if (!isFirebaseConfigured()) {
    return (
      <SafeAreaView style={styles.root}>
        <StatusBar style="dark" />
        <View style={styles.topBar}>
          <Pressable onPress={onClose} accessibilityRole="button">
            <Text style={styles.topAction}>סגירה</Text>
          </Pressable>
          <Text style={styles.topTitle}>אזור אישי</Text>
          <View style={styles.topSpacer} />
        </View>
        <Text style={styles.centerMuted}>אין חיבור לשרת.</Text>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.root}>
        <StatusBar style="dark" />
        <View style={styles.topBar}>
          <Pressable onPress={onClose} accessibilityRole="button">
            <Text style={styles.topAction}>סגירה</Text>
          </Pressable>
          <Text style={styles.topTitle}>אזור אישי</Text>
          <View style={styles.topSpacer} />
        </View>
        <Text style={styles.centerMuted}>טוען…</Text>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.root}>
        <StatusBar style="dark" />
        <View style={styles.topBar}>
          <Pressable onPress={onClose} accessibilityRole="button">
            <Text style={styles.topAction}>סגירה</Text>
          </Pressable>
          <Text style={styles.topTitle}>אזור אישי</Text>
          <View style={styles.topSpacer} />
        </View>
        <View style={styles.guestBody}>
          <Pressable style={styles.primaryBtn} onPress={openAuthModal}>
            <Text style={styles.primaryBtnText}>כניסה</Text>
          </Pressable>
        </View>
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
        <Text style={styles.topTitle}>אזור אישי</Text>
        <View style={styles.topSpacer} />
      </View>

      <View style={styles.tabRow}>
        <Pressable
          style={[styles.tab, tab === "active" && styles.tabOn]}
          onPress={() => setTab("active")}
          accessibilityRole="tab"
          accessibilityState={{ selected: tab === "active" }}
        >
          <Text style={[styles.tabText, tab === "active" && styles.tabTextOn]}>פעילות</Text>
        </Pressable>
        <Pressable
          style={[styles.tab, tab === "draft" && styles.tabOn]}
          onPress={() => setTab("draft")}
          accessibilityRole="tab"
          accessibilityState={{ selected: tab === "draft" }}
        >
          <Text style={[styles.tabText, tab === "draft" && styles.tabTextOn]}>טיוטות</Text>
        </Pressable>
        <Pressable
          style={[styles.tab, tab === "offFeed" && styles.tabOn]}
          onPress={() => setTab("offFeed")}
          accessibilityRole="tab"
          accessibilityState={{ selected: tab === "offFeed" }}
        >
          <Text style={[styles.tabText, tab === "offFeed" && styles.tabTextOn]}>ירדו מהלוח</Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        bounces={false}
        showsVerticalScrollIndicator={false}
      >
        {listLoading && rows.length === 0 ? <Text style={styles.rowMuted}>טוען מודעות…</Text> : null}
        {listError ? <Text style={styles.rowMuted}>לא ניתן לטעון כרגע.</Text> : null}
        {!listLoading && !listError && filtered.length === 0 ? <Text style={styles.rowMuted}>אין פריטים.</Text> : null}

        {filtered.map((listing) => {
          const publishCountdown = listingPublishCountdownLabel(listing);
          const publishCountdownUrgent = listingPublishCountdownIsUrgent(listing);
          return (
          <View key={listing.id} style={styles.card}>
            <Pressable
              style={styles.cardMain}
              onPress={() => onOpenListing(listing)}
              accessibilityRole="button"
              disabled={actionBusyId === listing.id}
            >
              <Image source={{ uri: listing.imageUrl }} style={styles.thumb} />
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle} numberOfLines={1}>
                  {listing.title}
                </Text>
                <Text style={styles.cardMeta} numberOfLines={2}>
                  ₪{listing.priceIls.toLocaleString("he-IL")} · {formatListingLocationLine(listing)}
                </Text>
                <Text style={statusPillStyle(listing.status)}>{LISTING_STATUS_LABEL_HE[listing.status]}</Text>
                {publishCountdown ? (
                  <Text
                    style={[
                      styles.countdown,
                      publishCountdownUrgent ? styles.countdownUrgent : null,
                    ]}
                    numberOfLines={2}
                  >
                    {publishCountdown}
                  </Text>
                ) : null}
              </View>
            </Pressable>
            <Pressable
              style={styles.menuBtn}
              onPress={() => openListingMenu(listing)}
              accessibilityRole="button"
              accessibilityLabel="פעולות על המודעה"
              disabled={actionBusyId === listing.id}
            >
              <Text style={styles.menuDots}>⋮</Text>
            </Pressable>
          </View>
          );
        })}

        <View style={styles.moreDivider} />
        <Pressable style={styles.moreRow} onPress={onOpenNotifications} accessibilityRole="button">
          <Text style={styles.moreLabel}>התראות</Text>
          {notifUnread > 0 ? (
            <View style={styles.notifBadge}>
              <Text style={styles.notifBadgeText}>{notifUnread > 99 ? "99+" : notifUnread}</Text>
            </View>
          ) : null}
        </Pressable>
        <Pressable style={styles.moreRow} onPress={onOpenSettings} accessibilityRole="button">
          <Text style={styles.moreLabel}>הגדרות</Text>
        </Pressable>
      </ScrollView>

      <Modal visible={menuListing != null} transparent animationType="fade" onRequestClose={closeListingMenu}>
        <Pressable style={styles.menuBackdrop} onPress={closeListingMenu}>
          <Pressable style={styles.menuSheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.menuSheetTitle} numberOfLines={2}>
              {menuListing?.title ?? "פעולות"}
            </Text>
            {menuListing
              ? listingOwnerActionsForStatus(menuListing.status).map((action) => (
                  <Pressable
                    key={action}
                    style={styles.menuSheetItem}
                    onPress={() => pickMenuAction(action)}
                    accessibilityRole="button"
                  >
                    <Text
                      style={
                        listingOwnerActionIsDestructive(action)
                          ? styles.menuSheetItemDanger
                          : styles.menuSheetItemText
                      }
                    >
                      {LISTING_OWNER_ACTION_LABEL_HE[action]}
                    </Text>
                  </Pressable>
                ))
              : null}
            <Pressable style={styles.menuSheetCancel} onPress={closeListingMenu} accessibilityRole="button">
              <Text style={styles.menuSheetCancelText}>ביטול</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={actionDialog != null} transparent animationType="fade" onRequestClose={closeActionDialog}>
        <Pressable style={styles.confirmBackdrop} onPress={closeActionDialog}>
          <Pressable style={styles.confirmCard} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.confirmTitle}>{actionDialog?.title}</Text>
            <Text style={styles.confirmBody}>{actionDialog?.body}</Text>
            <View style={styles.confirmActions}>
              {actionDialog?.kind === "confirm" ? (
                <Pressable
                  style={styles.confirmCancelBtn}
                  onPress={closeActionDialog}
                  disabled={actionBusyId != null}
                  accessibilityRole="button"
                >
                  <Text style={styles.confirmCancelText}>ביטול</Text>
                </Pressable>
              ) : null}
              <Pressable
                style={[
                  styles.confirmPrimaryBtn,
                  actionDialog?.kind === "confirm" && actionDialog.destructive
                    ? styles.confirmDangerBtn
                    : null,
                  actionDialog?.kind !== "confirm" ? styles.confirmPrimaryBtnFull : null,
                ]}
                onPress={confirmActionDialog}
                disabled={actionBusyId != null}
                accessibilityRole="button"
              >
                <Text style={styles.confirmPrimaryText}>
                  {actionDialog?.kind === "confirm"
                    ? actionDialog.confirmLabel
                    : actionDialog?.kind === "info"
                      ? actionDialog.confirmLabel
                      : "הבנתי"}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  topBar: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e4e5e7",
  },
  topAction: {
    fontSize: 15,
    fontWeight: "700",
    color: "#202125",
    minWidth: 56,
    textAlign: "right",
  },
  topTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#202125",
  },
  topSpacer: {
    minWidth: 56,
  },
  tabRow: {
    flexDirection: "row-reverse",
    gap: 8,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 10,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(16,24,32,0.1)",
    backgroundColor: "#fafafa",
    alignItems: "center",
  },
  tabOn: {
    borderColor: "rgba(8,184,200,0.35)",
    backgroundColor: "#e8f6fa",
  },
  tabText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#64748b",
  },
  tabTextOn: {
    color: "#202125",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 14,
    paddingBottom: 28,
    gap: 10,
  },
  rowMuted: {
    textAlign: "right",
    paddingVertical: 16,
    fontSize: 15,
    fontWeight: "700",
    color: "#64748b",
  },
  centerMuted: {
    textAlign: "center",
    marginTop: 24,
    fontSize: 15,
    fontWeight: "700",
    color: "#64748b",
    paddingHorizontal: 20,
  },
  guestBody: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  primaryBtn: {
    backgroundColor: "#009DE0",
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryBtnText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 15,
  },
  card: {
    flexDirection: "row-reverse",
    alignItems: "stretch",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(16,24,32,0.08)",
    backgroundColor: "#fff",
    overflow: "hidden",
  },
  cardMain: {
    flex: 1,
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 12,
    padding: 12,
    minWidth: 0,
  },
  menuBtn: {
    width: 40,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  menuDots: {
    fontSize: 20,
    fontWeight: "900",
    color: "#64748b",
    lineHeight: 22,
  },
  menuBackdrop: {
    flex: 1,
    backgroundColor: "rgba(16,24,32,0.45)",
    justifyContent: "flex-end",
  },
  menuSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    paddingBottom: 28,
    paddingHorizontal: 16,
  },
  menuSheetTitle: {
    textAlign: "right",
    fontSize: 16,
    fontWeight: "800",
    color: "#202125",
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  menuSheetItem: {
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderTopWidth: 1,
    borderTopColor: "#eef0f2",
  },
  menuSheetItemText: {
    textAlign: "right",
    fontSize: 16,
    fontWeight: "700",
    color: "#202125",
  },
  menuSheetItemDanger: {
    textAlign: "right",
    fontSize: 16,
    fontWeight: "700",
    color: "#b91c1c",
  },
  menuSheetCancel: {
    marginTop: 8,
    paddingVertical: 14,
    alignItems: "center",
  },
  menuSheetCancelText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#64748b",
  },
  confirmBackdrop: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
    backgroundColor: "rgba(16,24,32,0.32)",
  },
  confirmCard: {
    borderRadius: 18,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "rgba(16,24,32,0.08)",
    shadowColor: "#202125",
    shadowOpacity: 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  confirmTitle: {
    textAlign: "right",
    fontSize: 17,
    fontWeight: "800",
    color: "#202125",
  },
  confirmBody: {
    marginTop: 10,
    textAlign: "right",
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "600",
    color: "#64748b",
  },
  confirmActions: {
    flexDirection: "row-reverse",
    gap: 10,
    marginTop: 20,
  },
  confirmCancelBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(16,24,32,0.12)",
    backgroundColor: "#ffffff",
  },
  confirmCancelText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#202125",
  },
  confirmPrimaryBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "#009de0",
  },
  confirmPrimaryBtnFull: {
    flex: 1,
  },
  confirmDangerBtn: {
    backgroundColor: "#a21e2e",
  },
  confirmPrimaryText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#fff",
  },
  thumb: {
    width: 88,
    height: 72,
    borderRadius: 14,
    backgroundColor: "#eee",
  },
  cardBody: {
    flex: 1,
    minWidth: 0,
  },
  cardTitle: {
    textAlign: "right",
    fontSize: 15,
    fontWeight: "800",
    color: "#202125",
  },
  cardMeta: {
    marginTop: 4,
    textAlign: "right",
    fontSize: 13,
    fontWeight: "600",
    color: "#64748b",
  },
  pill: {
    marginTop: 8,
    alignSelf: "flex-end",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    overflow: "hidden",
    fontSize: 11,
    fontWeight: "800",
  },
  pillActive: {
    backgroundColor: "rgba(8,184,200,0.18)",
    color: "#065a63",
  },
  pillFrozen: {
    backgroundColor: "rgba(99,102,241,0.14)",
    color: "#4338ca",
  },
  pillDraft: {
    backgroundColor: "rgba(245,158,11,0.15)",
    color: "#92400e",
  },
  pillOff: {
    backgroundColor: "rgba(107,114,128,0.12)",
    color: "#374151",
  },
  countdown: {
    marginTop: 6,
    textAlign: "right",
    fontSize: 13,
    fontWeight: "800",
    color: "#0d5c66",
    lineHeight: 18,
  },
  countdownUrgent: {
    color: "#c1121f",
  },
  moreDivider: {
    height: 1,
    backgroundColor: "#e4e5e7",
    marginTop: 18,
    marginBottom: 6,
  },
  moreRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  moreLabel: {
    fontSize: 15,
    fontWeight: "800",
    color: "#202125",
  },
  moreSoon: {
    fontSize: 12,
    fontWeight: "800",
    color: "#8b949b",
  },
  notifBadge: {
    minWidth: 22,
    height: 22,
    paddingHorizontal: 6,
    borderRadius: 999,
    backgroundColor: "#e63946",
    alignItems: "center",
    justifyContent: "center",
  },
  notifBadgeText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "900",
  },
});
