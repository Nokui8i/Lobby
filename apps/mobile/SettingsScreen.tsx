import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useState } from "react";
import { Pressable, SafeAreaView, StyleSheet, Switch, Text, View } from "react-native";
import { fetchPushNotificationsEnabled, setPushNotificationsEnabled } from "./lib/firebase/notifications";
import { isFirebaseConfigured } from "./lib/firebase/isConfigured";
import { useLobbyAuth } from "./lib/LobbyAuthContext";
import { registerForPushNotificationsAsync } from "./hooks/pushRegistration";

export function SettingsScreen({
  onClose,
  onPushEnabled,
}: {
  onClose: () => void;
  onPushEnabled?: () => void;
}) {
  const { user, loading, openAuthModal } = useLobbyAuth();
  const [pushEnabled, setPushEnabled] = useState(true);
  const [loadingPref, setLoadingPref] = useState(true);
  const [saving, setSaving] = useState(false);

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

  const handleToggle = useCallback(
    async (next: boolean) => {
      if (!user || saving) {
        return;
      }
      setPushEnabled(next);
      setSaving(true);
      try {
        await setPushNotificationsEnabled(user.uid, next);
        if (next) {
          await registerForPushNotificationsAsync(user.uid);
          onPushEnabled?.();
        }
      } catch {
        setPushEnabled(!next);
      } finally {
        setSaving(false);
      }
    },
    [user, saving, onPushEnabled],
  );

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
          <Text style={styles.topTitle}>הגדרות</Text>
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
        <Text style={styles.topTitle}>הגדרות</Text>
        <View style={styles.topSpacer} />
      </View>
      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.rowLabel}>התראות Push</Text>
            <Text style={styles.rowHint}>גם כשהאפליקציה סגורה</Text>
          </View>
          <Switch
            value={pushEnabled}
            disabled={saving}
            onValueChange={(v) => void handleToggle(v)}
            trackColor={{ false: "#d1d5db", true: "#08b8c8" }}
            thumbColor="#ffffff"
          />
        </View>
      </View>
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
  topTitle: { fontSize: 18, fontWeight: "800", color: "#101820" },
  topSpacer: { minWidth: 56 },
  card: {
    margin: 14,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(16,24,32,0.08)",
    backgroundColor: "#fff",
  },
  row: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  rowText: { flex: 1 },
  rowLabel: { textAlign: "right", fontSize: 15, fontWeight: "800", color: "#101820" },
  rowHint: { marginTop: 4, textAlign: "right", fontSize: 13, fontWeight: "600", color: "#687076" },
  muted: { textAlign: "center", marginTop: 24, fontSize: 15, fontWeight: "700", color: "#687076" },
  primaryBtn: {
    margin: 20,
    backgroundColor: "#101820",
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryBtnText: { color: "#fff", fontWeight: "900", fontSize: 15 },
});
