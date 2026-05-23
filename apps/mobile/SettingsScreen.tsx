import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { USER_DISPLAY_NAME_MAX_LENGTH } from "@lobby/shared";
import { fetchPushNotificationsEnabled, setPushNotificationsEnabled } from "./lib/firebase/notifications";
import { isFirebaseConfigured } from "./lib/firebase/isConfigured";
import { useLobbyAuth } from "./lib/LobbyAuthContext";
import { registerForPushNotificationsAsync } from "./hooks/pushRegistration";
import { L } from "./styles/lovableTokens";

function IconTile({ children }: { children: ReactNode }) {
  return <View style={styles.iconTile}>{children}</View>;
}

function SectionCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.sectionWrap}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

function LinkRow({
  label,
  hint,
  glyph,
  onPress,
}: {
  label: string;
  hint?: string;
  glyph: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.linkRow} onPress={onPress} accessibilityRole="button">
      <IconTile>
        <Text style={styles.iconGlyph}>{glyph}</Text>
      </IconTile>
      <View style={styles.linkText}>
        <Text style={styles.rowLabel}>{label}</Text>
        {hint ? <Text style={styles.rowHint}>{hint}</Text> : null}
      </View>
      <Text style={styles.chevron}>‹</Text>
    </Pressable>
  );
}

export function SettingsScreen({
  onClose,
  onOpenNotifications,
  onPushEnabled,
}: {
  onClose: () => void;
  onOpenNotifications?: () => void;
  onPushEnabled?: () => void;
}) {
  const { user, loading, openAuthModal, displayNameForUi, updateDisplayName, signOutUser } = useLobbyAuth();
  const [pushEnabled, setPushEnabled] = useState(true);
  const [loadingPref, setLoadingPref] = useState(true);
  const [savingPush, setSavingPush] = useState(false);
  const [displayNameDraft, setDisplayNameDraft] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [nameMessage, setNameMessage] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !isFirebaseConfigured()) {
      setLoadingPref(false);
      return;
    }
    let cancelled = false;
    void fetchPushNotificationsEnabled(user.uid).then((enabled) => {
      if (!cancelled) {
        setPushEnabled(enabled);
        setLoadingPref(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (user) {
      setDisplayNameDraft(displayNameForUi);
    }
  }, [user, displayNameForUi]);

  const handleToggle = useCallback(
    async (next: boolean) => {
      if (!user || savingPush) {
        return;
      }
      setPushEnabled(next);
      setSavingPush(true);
      try {
        await setPushNotificationsEnabled(user.uid, next);
        if (next) {
          await registerForPushNotificationsAsync(user.uid);
          onPushEnabled?.();
        }
      } catch {
        setPushEnabled(!next);
      } finally {
        setSavingPush(false);
      }
    },
    [user, savingPush, onPushEnabled],
  );

  const handleSaveName = useCallback(async () => {
    if (!user || savingName) {
      return;
    }
    const trimmed = displayNameDraft.trim();
    if (trimmed === displayNameForUi.trim()) {
      setNameMessage("אין שינוי לשמירה.");
      setNameError(null);
      return;
    }
    setSavingName(true);
    setNameMessage(null);
    setNameError(null);
    try {
      await updateDisplayName(displayNameDraft);
      setNameMessage("השם עודכן.");
    } catch (e) {
      setNameError(e instanceof Error ? e.message : "לא הצלחנו לשמור.");
    } finally {
      setSavingName(false);
    }
  }, [user, savingName, displayNameDraft, displayNameForUi, updateDisplayName]);

  const nameDirty = displayNameDraft.trim() !== displayNameForUi.trim();

  if (!isFirebaseConfigured()) {
    return (
      <SafeAreaView style={styles.root}>
        <StatusBar style="dark" />
        <Text style={styles.muted}>אין חיבור לשרת.</Text>
      </SafeAreaView>
    );
  }

  if (loading || loadingPref) {
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
          <Text style={styles.topTitle}>הגדרות חשבון</Text>
          <View style={styles.topSpacer} />
        </View>
        <Pressable style={styles.primaryBtn} onPress={openAuthModal}>
          <Text style={styles.primaryBtnText}>כניסה</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const email = user.email ?? "—";
  const displayName = displayNameForUi.trim() || email.split("@")[0] || "משתמש";
  const initial = displayName.charAt(0) || "?";

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar style="dark" />
      <View style={styles.topBar}>
        <Pressable onPress={onClose} accessibilityRole="button">
          <Text style={styles.topAction}>סגירה</Text>
        </Pressable>
        <Text style={styles.topTitle}>הגדרות חשבון</Text>
        <View style={styles.topSpacer} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <SectionCard title="פרופיל">
          <View style={styles.profileHead}>
            <View style={styles.heroAvatar}>
              <Text style={styles.heroAvatarText}>{initial}</Text>
            </View>
            <View style={styles.heroText}>
              <Text style={styles.heroName} numberOfLines={1}>
                {displayName}
              </Text>
              <Text style={styles.heroEmail} numberOfLines={1}>
                {email}
              </Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.innerPad}>
            <Text style={styles.fieldLabel}>שם להצגה</Text>
            <Text style={styles.fieldHint}>עד {USER_DISPLAY_NAME_MAX_LENGTH} תווים</Text>
            <TextInput
              style={styles.input}
              value={displayNameDraft}
              onChangeText={(t) => {
                setDisplayNameDraft(t);
                setNameMessage(null);
                setNameError(null);
              }}
              maxLength={USER_DISPLAY_NAME_MAX_LENGTH}
              textAlign="right"
              placeholderTextColor="#94a3b8"
            />
            {nameError ? <Text style={styles.errorText}>{nameError}</Text> : null}
            {nameMessage ? <Text style={styles.okText}>{nameMessage}</Text> : null}
            <Pressable
              style={[styles.saveBtn, (savingName || !nameDirty || !displayNameDraft.trim()) && styles.saveBtnDisabled]}
              disabled={savingName || !nameDirty || !displayNameDraft.trim()}
              onPress={() => void handleSaveName()}
            >
              <Text style={styles.saveBtnText}>{savingName ? "שומר…" : "שמירת שם"}</Text>
            </Pressable>
          </View>
          <View style={styles.divider} />
          <View style={[styles.linkRow, styles.linkRowStatic]}>
            <IconTile>
              <Text style={styles.iconGlyph}>✉</Text>
            </IconTile>
            <View style={styles.linkText}>
              <Text style={styles.rowLabel}>אימייל (לקריאה בלבד)</Text>
              <Text style={styles.emailValue}>{email}</Text>
            </View>
          </View>
        </SectionCard>

        <SectionCard title="התראות">
          <View style={styles.toggleRow}>
            <IconTile>
              <Text style={styles.iconGlyph}>🔔</Text>
            </IconTile>
            <View style={styles.linkText}>
              <Text style={styles.rowLabel}>התראות Push</Text>
              <Text style={styles.rowHint}>באפליקציית Lobby — גם כשהאפליקציה סגורה</Text>
            </View>
            <Switch
              value={pushEnabled}
              disabled={savingPush}
              onValueChange={(v) => void handleToggle(v)}
              trackColor={{ false: "#d1d5db", true: L.brand }}
              thumbColor="#ffffff"
              style={styles.toggleSwitch}
            />
          </View>
          {onOpenNotifications ? (
            <>
              <View style={styles.dividerInset} />
              <LinkRow
                glyph="🔔"
                label="התראות במערכת"
                hint="מודעות, צ׳אט ופניות"
                onPress={onOpenNotifications}
              />
            </>
          ) : null}
        </SectionCard>

        <SectionCard title="חשבון">
          <Pressable
            style={styles.linkRow}
            onPress={() => void signOutUser().then(onClose)}
            accessibilityRole="button"
          >
            <IconTile>
              <Text style={styles.iconGlyph}>⎋</Text>
            </IconTile>
            <View style={styles.linkText}>
              <Text style={styles.rowLabel}>התנתקות</Text>
            </View>
          </Pressable>
        </SectionCard>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: L.background },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 0, paddingBottom: 20 },
  topBar: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: L.border,
    backgroundColor: "rgba(255,255,255,0.92)",
  },
  topAction: { fontSize: 16, fontWeight: "700", color: L.graphite, minWidth: 56, textAlign: "right" },
  topTitle: { fontSize: 20, fontWeight: "800", color: L.graphite },
  topSpacer: { minWidth: 56 },
  profileHead: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  heroAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: L.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  heroAvatarText: { color: "#fff", fontSize: 22, fontWeight: "900" },
  heroText: { flex: 1, minWidth: 0 },
  heroName: { textAlign: "right", fontSize: 17, fontWeight: "800", color: L.graphite },
  heroEmail: { marginTop: 2, textAlign: "right", fontSize: 14, fontWeight: "600", color: L.muted },
  sectionWrap: { marginBottom: 10 },
  sectionTitle: {
    marginBottom: 5,
    paddingHorizontal: 4,
    textAlign: "right",
    fontSize: 15,
    fontWeight: "800",
    color: L.graphite,
  },
  card: {
    borderRadius: 14,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "rgba(16,24,32,0.08)",
    overflow: "hidden",
    paddingVertical: 2,
  },
  innerPad: { paddingHorizontal: 16, paddingVertical: 14 },
  iconTile: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: L.brandSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  iconGlyph: { fontSize: 18 },
  fieldLabel: { textAlign: "right", fontSize: 16, fontWeight: "800", color: L.graphite },
  fieldHint: { marginTop: 4, marginBottom: 10, textAlign: "right", fontSize: 13, fontWeight: "600", color: L.muted },
  input: {
    borderWidth: 1,
    borderColor: "rgba(16,24,32,0.1)",
    borderRadius: 12,
    backgroundColor: L.surfaceSoft,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
    fontWeight: "600",
    color: L.graphite,
  },
  toggleSwitch: { transform: [{ scaleX: 0.68 }, { scaleY: 0.68 }] },
  saveBtn: {
    marginTop: 8,
    alignSelf: "flex-end",
    backgroundColor: L.brand,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    shadowColor: "rgba(0, 157, 224, 0.35)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 2,
  },
  saveBtnDisabled: { opacity: 0.45 },
  saveBtnText: { color: "#fff", fontWeight: "800", fontSize: 13 },
  errorText: { marginTop: 10, textAlign: "right", fontSize: 14, fontWeight: "700", color: "#b91c1c" },
  okText: { marginTop: 10, textAlign: "right", fontSize: 14, fontWeight: "700", color: "#047857" },
  divider: { height: 1, backgroundColor: "rgba(16,24,32,0.06)", marginHorizontal: 14 },
  dividerInset: { height: 1, backgroundColor: "rgba(16,24,32,0.06)", marginHorizontal: 14 },
  emailValue: { marginTop: 4, textAlign: "right", fontSize: 16, fontWeight: "700", color: L.graphite },
  linkRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  linkRowStatic: { paddingVertical: 12 },
  linkText: { flex: 1, minWidth: 0 },
  rowLabel: { textAlign: "right", fontSize: 16, fontWeight: "800", color: L.graphite },
  rowHint: { marginTop: 4, textAlign: "right", fontSize: 13, fontWeight: "600", color: L.muted },
  chevron: { fontSize: 26, fontWeight: "300", color: "rgba(32,33,37,0.28)", marginTop: -2 },
  toggleRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  muted: { textAlign: "center", marginTop: 24, fontSize: 15, fontWeight: "700", color: L.muted },
  primaryBtn: {
    margin: 20,
    backgroundColor: L.brand,
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryBtnText: { color: "#fff", fontWeight: "900", fontSize: 15 },
});
