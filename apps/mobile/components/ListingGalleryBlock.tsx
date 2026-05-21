import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { lobbyDesign } from "@lobby/shared";
import { SaveListingButton } from "./SaveListingButton";

const C = lobbyDesign.colors;

function dedupeGalleryUrls(imageUrl: string, gallery: string[]): string[] {
  const raw = gallery.filter((u) => typeof u === "string" && u.trim().length > 0).map((u) => u.trim());
  const seen = new Set<string>();
  const out: string[] = [];
  for (const u of raw) {
    if (!seen.has(u)) {
      seen.add(u);
      out.push(u);
    }
  }
  if (out.length > 0) {
    return out;
  }
  const single = imageUrl.trim();
  return single ? [single] : [];
}

export function ListingGalleryBlock({
  imageUrl,
  gallery,
  title,
  listingId,
  priceIls,
}: {
  imageUrl: string;
  gallery: string[];
  title: string;
  listingId: string;
  priceIls: number;
}) {
  const { height: winH, width: winW } = useWindowDimensions();
  const urls = useMemo(() => dedupeGalleryUrls(imageUrl, gallery), [imageUrl, gallery]);
  const [selected, setSelected] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const mainHeight = Math.round((winW - 28) * (8 / 16));

  useEffect(() => {
    setSelected((i) => (urls.length ? Math.min(Math.max(0, i), urls.length - 1) : 0));
  }, [urls]);

  const openLightbox = useCallback((index: number) => {
    setSelected(index);
    setLightboxOpen(true);
  }, []);

  const goPrev = useCallback(() => {
    setSelected((i) => (i - 1 + urls.length) % urls.length);
  }, [urls.length]);

  const goNext = useCallback(() => {
    setSelected((i) => (i + 1) % urls.length);
  }, [urls.length]);

  if (urls.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>אין תמונות למודעה</Text>
      </View>
    );
  }

  const current = urls[selected]!;

  return (
    <View style={styles.shell}>
      <View style={[styles.mainWrap, { height: mainHeight }]}>
        <SaveListingButton
          listingId={listingId}
          listingTitle={title}
          imageUrl={imageUrl}
          priceIls={priceIls}
          variant="gallery"
          style={styles.gallerySave}
        />
        <Pressable
          onPress={() => openLightbox(selected)}
          style={({ pressed }) => [styles.mainPressable, pressed && styles.mainPressed]}
          accessibilityRole="button"
          accessibilityLabel={`הגדלת תמונה ${selected + 1} מתוך ${urls.length}`}
        >
          <Image
            source={{ uri: current }}
            style={styles.mainImage}
            resizeMode="cover"
            accessibilityLabel={`${title} — תמונה ${selected + 1}`}
          />
        </Pressable>
      </View>

      {urls.length > 1 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.thumbRow}
          style={styles.thumbScroll}
        >
          {urls.map((uri, index) => (
            <Pressable
              key={`${uri}-${index}`}
              onPress={() => setSelected(index)}
              style={[styles.thumb, index === selected && styles.thumbSelected]}
              accessibilityRole="button"
              accessibilityLabel={`תמונה ${index + 1}`}
            >
              <Image source={{ uri }} style={styles.thumbImage} resizeMode="cover" />
            </Pressable>
          ))}
        </ScrollView>
      ) : null}

      <Modal visible={lightboxOpen} transparent animationType="fade" onRequestClose={() => setLightboxOpen(false)}>
        <Pressable style={styles.lightboxBackdrop} onPress={() => setLightboxOpen(false)}>
          <Pressable style={styles.lightboxInner} onPress={(e) => e.stopPropagation()}>
            <Pressable style={styles.lightboxClose} onPress={() => setLightboxOpen(false)} accessibilityLabel="סגירה">
              <Text style={styles.lightboxCloseText}>×</Text>
            </Pressable>

            {urls.length > 1 ? (
              <View style={styles.lightboxNavRow}>
                <Pressable style={styles.lightboxNavBtn} onPress={goNext} accessibilityLabel="תמונה הבאה">
                  <Text style={styles.lightboxNavText}>›</Text>
                </Pressable>
                <Pressable style={styles.lightboxNavBtn} onPress={goPrev} accessibilityLabel="תמונה קודמת">
                  <Text style={styles.lightboxNavText}>‹</Text>
                </Pressable>
              </View>
            ) : null}

            <Image
              source={{ uri: current }}
              style={[styles.lightboxImage, { height: Math.min(winH * 0.72, 560), maxHeight: winH * 0.78 }]}
              resizeMode="contain"
              accessibilityLabel={`${title} — תמונה ${selected + 1}`}
            />

            {urls.length > 1 ? (
              <Text style={styles.lightboxCounter}>
                {selected + 1} / {urls.length}
              </Text>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    marginBottom: 12,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: "rgba(15, 23, 42, 0.08)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 2,
  },
  mainWrap: {
    position: "relative",
    width: "100%",
    backgroundColor: "#f8f9fa",
    overflow: "hidden",
  },
  gallerySave: {
    position: "absolute",
    top: 12,
    left: 12,
    zIndex: 3,
  },
  mainPressable: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  mainPressed: {
    opacity: 0.95,
  },
  mainImage: {
    width: "100%",
    height: "100%",
  },
  thumbScroll: {
    flexGrow: 0,
  },
  thumbRow: {
    flexDirection: "row-reverse",
    gap: 8,
    padding: 12,
  },
  thumb: {
    width: 112,
    height: 80,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "transparent",
    opacity: 0.75,
    backgroundColor: "#f8f9fa",
  },
  thumbSelected: {
    borderColor: C.brand,
    opacity: 1,
  },
  thumbImage: {
    width: "100%",
    height: "100%",
  },
  empty: {
    minHeight: 200,
    borderRadius: 16,
    backgroundColor: "#f8f9fa",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.border,
  },
  emptyText: {
    color: "#64748b",
    fontWeight: "600",
    fontSize: 15,
  },
  lightboxBackdrop: {
    flex: 1,
    backgroundColor: "rgba(10, 12, 14, 0.92)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  lightboxInner: {
    width: "100%",
    maxWidth: 720,
    alignItems: "center",
    justifyContent: "center",
  },
  lightboxClose: {
    position: "absolute",
    top: 8,
    left: 8,
    zIndex: 4,
    width: 44,
    height: 44,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.14)",
    justifyContent: "center",
    alignItems: "center",
  },
  lightboxCloseText: {
    color: "#fff",
    fontSize: 28,
    lineHeight: 32,
    fontWeight: "400",
  },
  lightboxNavRow: {
    position: "absolute",
    top: "42%",
    width: "100%",
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    paddingHorizontal: 4,
    zIndex: 3,
    pointerEvents: "box-none",
  },
  lightboxNavBtn: {
    width: 44,
    height: 44,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.14)",
    justifyContent: "center",
    alignItems: "center",
  },
  lightboxNavText: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "800",
  },
  lightboxImage: {
    width: "100%",
  },
  lightboxCounter: {
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: "rgba(0,0,0,0.45)",
    color: "#fff",
    fontWeight: "800",
    fontSize: 13,
  },
});
