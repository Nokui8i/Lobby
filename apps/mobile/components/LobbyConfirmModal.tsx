import { Pressable, StyleSheet, Text, View } from "react-native";

export function LobbyConfirmModal({
  visible,
  title,
  body,
  confirmLabel,
  cancelLabel = "ביטול",
  destructive = false,
  busy = false,
  onCancel,
  onConfirm,
}: {
  visible: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!visible) {
    return null;
  }

  return (
    <Pressable style={styles.backdrop} onPress={busy ? undefined : onCancel} accessibilityViewIsModal>
      <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.body}>{body}</Text>
        <View style={styles.actions}>
          <Pressable style={styles.cancelBtn} disabled={busy} onPress={onCancel}>
            <Text style={styles.cancelText}>{cancelLabel}</Text>
          </Pressable>
          <Pressable
            style={[styles.confirmBtn, destructive && styles.confirmDanger]}
            disabled={busy}
            onPress={onConfirm}
          >
            <Text style={styles.confirmText}>{busy ? "מוחק…" : confirmLabel}</Text>
          </Pressable>
        </View>
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(16, 24, 32, 0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    zIndex: 100,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    gap: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: "#101820",
    textAlign: "right",
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    color: "#4a5560",
    textAlign: "right",
  },
  actions: {
    flexDirection: "row-reverse",
    gap: 10,
    marginTop: 8,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#f0f2f4",
    alignItems: "center",
  },
  cancelText: {
    fontWeight: "800",
    color: "#101820",
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#08b8c8",
    alignItems: "center",
  },
  confirmDanger: {
    backgroundColor: "#c62828",
  },
  confirmText: {
    fontWeight: "800",
    color: "#fff",
  },
});
