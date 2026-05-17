import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import {
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  SAVED_LISTING_REMOVED_HE,
  SAVED_LISTINGS_EMPTY_HE,
  SAVED_LISTINGS_HINT_HE,
  SAVED_LISTINGS_TITLE_HE,
  type RentalListing,
} from "@lobby/shared";
import { SaveListingButton } from "./components/SaveListingButton";
import { fetchListingByIdFromFirestore } from "./lib/firebase/listingQueries";
import { fetchSavedListingRecords } from "./lib/firebase/savedListings";
import { isFirebaseConfigured } from "./lib/firebase/isConfigured";
import { useLobbyAuth } from "./lib/LobbyAuthContext";

type SavedRow = {
  record: Awaited<ReturnType<typeof fetchSavedListingRecords>>[number];
  listing: RentalListing | null;
};

export function SavedListingsScreen({
  onClose,
  onOpenListing,
}: {
  onClose: () => void;
  onOpenListing: (listing: RentalListing) => void;
}) {
  const { user, loading: authLoading, openAuthModal } = useLobbyAuth();
  const [rows, setRows] = useState<SavedRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!user || !isFirebaseConfigured()) {
        if (!cancelled) {
          setRows([]);
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      try {
        const records = await fetchSavedListingRecords(user.uid);
        const resolved: SavedRow[] = [];
        for (const record of records) {
          const listing = await fetchListingByIdFromFirestore(record.listingId);
          resolved.push({ record, listing });
        }
        if (!cancelled) {
          setRows(resolved);
        }
      } catch {
        if (!cancelled) {
          setRows([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="חזרה" onPress={onClose}>
          <Text style={styles.headerBtn}>חזרה</Text>
        </Pressable>
        <Text style={styles.headerTitle}>{SAVED_LISTINGS_TITLE_HE}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {!isFirebaseConfigured() ? <Text style={styles.muted}>אין חיבור לשרת.</Text> : null}

        {!authLoading && !user && isFirebaseConfigured() ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>יש להתחבר כדי לראות מודעות ששמרתם.</Text>
            <Pressable style={styles.cta} onPress={openAuthModal}>
              <Text style={styles.ctaText}>כניסה</Text>
            </Pressable>
          </View>
        ) : null}

        {user && loading ? <Text style={styles.muted}>טוענים…</Text> : null}

        {user && !loading && rows.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>{SAVED_LISTINGS_EMPTY_HE}</Text>
            <Text style={styles.muted}>{SAVED_LISTINGS_HINT_HE}</Text>
            <Pressable style={styles.cta} onPress={onClose}>
              <Text style={styles.ctaText}>חזרה ללוח</Text>
            </Pressable>
          </View>
        ) : null}

        {rows.map(({ record, listing }) => {
          if (!listing || listing.status !== "active") {
            return (
              <View key={record.listingId} style={styles.unavailable}>
                <Text style={styles.cardTitle}>{record.listingTitle || "מודעה"}</Text>
                <Text style={styles.muted}>{SAVED_LISTING_REMOVED_HE}</Text>
                <SaveListingButton
                  listingId={record.listingId}
                  listingTitle={record.listingTitle}
                  imageUrl={record.imageUrl}
                  priceIls={record.priceIls}
                  variant="card"
                />
              </View>
            );
          }

          return (
            <Pressable
              key={record.listingId}
              style={styles.card}
              onPress={() => onOpenListing(listing)}
            >
              <View style={styles.cardImageWrap}>
                <Image source={{ uri: listing.imageUrl }} style={styles.cardImage} />
                <SaveListingButton
                  listingId={listing.id}
                  listingTitle={listing.title}
                  imageUrl={listing.imageUrl}
                  priceIls={listing.priceIls}
                  variant="card"
                  style={styles.cardSave}
                />
              </View>
              <View style={styles.cardBody}>
                <View style={styles.cardTop}>
                  <Text style={styles.cardTitle} numberOfLines={2}>
                    {listing.title}
                  </Text>
                  <Text style={styles.cardPrice}>₪{listing.priceIls.toLocaleString("he-IL")}</Text>
                </View>
                <Text style={styles.muted}>
                  {listing.city}
                  {listing.neighborhood ? ` · ${listing.neighborhood}` : ""} · {listing.rooms} חד׳
                </Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#fbfaf7",
  },
  header: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e4e5e7",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#101820",
  },
  headerBtn: {
    fontSize: 15,
    fontWeight: "700",
    color: "#065a63",
  },
  headerSpacer: {
    width: 48,
  },
  scroll: {
    padding: 16,
    gap: 14,
    paddingBottom: 32,
  },
  muted: {
    color: "#74767e",
    fontSize: 14,
    textAlign: "right",
  },
  emptyBox: {
    padding: 24,
    borderRadius: 16,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "rgba(16,24,32,0.08)",
    alignItems: "center",
  },
  emptyText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#101820",
    textAlign: "center",
    marginBottom: 8,
  },
  cta: {
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#08b8c8",
  },
  ctaText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
  card: {
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "rgba(16,24,32,0.08)",
  },
  cardImageWrap: {
    height: 190,
    position: "relative",
  },
  cardImage: {
    width: "100%",
    height: "100%",
  },
  cardSave: {
    position: "absolute",
    top: 10,
    left: 10,
  },
  cardBody: {
    padding: 14,
  },
  cardTop: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "flex-start",
  },
  cardTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "800",
    color: "#101820",
    textAlign: "right",
  },
  cardPrice: {
    fontSize: 15,
    fontWeight: "800",
    color: "#101820",
  },
  unavailable: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "rgba(16,24,32,0.15)",
    gap: 8,
    alignItems: "flex-end",
  },
});
