import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet } from "react-native";
import { SAVED_LISTINGS_TITLE_HE } from "@lobby/shared";
import { useLobbyAuth } from "../lib/LobbyAuthContext";

export function SavedListingsHeaderButton({ onPress }: { onPress: () => void }) {
  const { user, openAuthModal } = useLobbyAuth();

  function handlePress() {
    if (!user) {
      openAuthModal();
      return;
    }
    onPress();
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={SAVED_LISTINGS_TITLE_HE}
      onPress={handlePress}
      style={styles.btn}
    >
      <Ionicons name="heart-outline" size={22} color="#64748B" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 4,
  },
});
