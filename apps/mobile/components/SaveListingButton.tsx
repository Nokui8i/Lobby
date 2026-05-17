import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { SAVED_LISTINGS_LOGIN_HE } from "@lobby/shared";
import type { SavedListingSnapshot } from "../lib/firebase/savedListings";
import { useLobbyAuth } from "../lib/LobbyAuthContext";
import { useSavedListingsOptional } from "../lib/SavedListingsContext";

export function SaveListingButton({
  listingId,
  listingTitle,
  imageUrl,
  priceIls,
  variant = "card",
  style,
}: {
  listingId: string;
  listingTitle: string;
  imageUrl?: string;
  priceIls?: number;
  variant?: "card" | "gallery";
  style?: StyleProp<ViewStyle>;
}) {
  const { user, openAuthModal } = useLobbyAuth();
  const savedCtx = useSavedListingsOptional();
  const [busy, setBusy] = useState(false);

  const saved = savedCtx?.isSaved(listingId) ?? false;

  async function handlePress() {
    if (!user) {
      openAuthModal();
      return;
    }
    if (!savedCtx || busy) {
      return;
    }

    setBusy(true);
    try {
      const snapshot: SavedListingSnapshot = {
        listingId,
        listingTitle,
        imageUrl,
        priceIls,
      };
      await savedCtx.toggleSave(snapshot);
    } finally {
      setBusy(false);
    }
  }

  const iconName = saved ? "heart" : "heart-outline";
  const iconColor = saved ? "#e11d48" : "#687076";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={saved ? "הסרה ממודעות שאהבתי" : "שמירה למודעות שאהבתי"}
      accessibilityHint={!user ? SAVED_LISTINGS_LOGIN_HE : undefined}
      disabled={busy}
      onPress={(e) => {
        e?.stopPropagation?.();
        void handlePress();
      }}
      style={({ pressed }) => [
        variant === "gallery" ? styles.galleryBtn : styles.cardBtn,
        pressed && styles.pressed,
        style,
      ]}
    >
      <Ionicons name={iconName} size={variant === "gallery" ? 20 : 22} color={iconColor} />
      {variant === "gallery" ? <Text style={styles.galleryLabel}>{saved ? "נשמר" : "שמירה"}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cardBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.94)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#101820",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  galleryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.92)",
    shadowColor: "#101820",
    shadowOpacity: 0.14,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  galleryLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#25313b",
  },
  pressed: {
    opacity: 0.85,
  },
});
