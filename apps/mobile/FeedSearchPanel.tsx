import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import {
  EMPTY_FEED_SEARCH_FILTERS,
  FEED_FEATURE_FILTER_OPTIONS,
  FEED_ROOM_FILTER_OPTIONS,
  FEED_SORT_OPTIONS,
  feedLocationFilterSummary,
  feedRequiredFeaturesSummary,
  feedRoomFilterIdFromFilters,
  feedSearchFiltersFromRoomId,
  feedSearchFiltersIsActive,
  LISTING_PROPERTY_TYPE_OPTIONS,
  toggleFeedRequiredFeature,
  type FeedSearchFilters,
  type FeedSortId,
} from "@lobby/shared";
import { lobbyDesign } from "@lobby/shared";
import { LocationSearchInput } from "./LocationSearchInput";

const C = lobbyDesign.colors;
const BRAND_BORDER = "rgba(0, 157, 224, 0.25)";

function priceSummary(filters: FeedSearchFilters): string {
  if (filters.minPriceIls == null && filters.maxPriceIls == null) {
    return "";
  }
  if (filters.minPriceIls != null && filters.maxPriceIls != null) {
    return `₪${filters.minPriceIls}–${filters.maxPriceIls}`;
  }
  if (filters.minPriceIls != null) {
    return `מ-₪${filters.minPriceIls}`;
  }
  return `עד ₪${filters.maxPriceIls}`;
}

export function FeedSearchPanel({
  appliedFilters,
  appliedSort,
  onSearch,
  onSortChange,
  loading = false,
}: {
  appliedFilters: FeedSearchFilters;
  appliedSort: FeedSortId;
  onSearch: (filters: FeedSearchFilters) => void;
  onSortChange: (sortId: FeedSortId) => void;
  loading?: boolean;
}) {
  const [draft, setDraft] = useState<FeedSearchFilters>(appliedFilters);

  useEffect(() => {
    setDraft(appliedFilters);
  }, [appliedFilters]);

  const roomId = feedRoomFilterIdFromFilters(draft);

  return (
    <View style={styles.wrap}>
      <LocationSearchInput
        label="איפה מחפשים?"
        value={draft.location}
        onChange={(location) => setDraft((prev) => ({ ...prev, location }))}
        disabled={loading}
        variant="feed"
        compact
        required={false}
      />

      <Text style={styles.fieldLabel}>סוג הנכס</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillRow}>
        <Pressable
          style={[styles.pill, draft.propertyTypeId === "" && styles.pillOn]}
          onPress={() => setDraft((prev) => ({ ...prev, propertyTypeId: "" }))}
        >
          <Text style={styles.pillText}>הכל</Text>
        </Pressable>
        {LISTING_PROPERTY_TYPE_OPTIONS.map((o) => (
          <Pressable
            key={o.id}
            style={[styles.pill, draft.propertyTypeId === o.id && styles.pillOn]}
            onPress={() => setDraft((prev) => ({ ...prev, propertyTypeId: o.id }))}
          >
            <Text style={styles.pillText}>{o.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <Text style={styles.fieldLabel}>מחיר (₪ לחודש)</Text>
      <View style={styles.priceRow}>
        <TextInput
          style={styles.priceInput}
          placeholder="מינימום"
          keyboardType="number-pad"
          textAlign="right"
          value={draft.minPriceIls != null ? String(draft.minPriceIls) : ""}
          onChangeText={(text) => {
            const raw = text.replace(/[^\d]/g, "");
            setDraft((prev) => ({ ...prev, minPriceIls: raw ? Number(raw) : null }));
          }}
        />
        <TextInput
          style={styles.priceInput}
          placeholder="מקסימום"
          keyboardType="number-pad"
          textAlign="right"
          value={draft.maxPriceIls != null ? String(draft.maxPriceIls) : ""}
          onChangeText={(text) => {
            const raw = text.replace(/[^\d]/g, "");
            setDraft((prev) => ({ ...prev, maxPriceIls: raw ? Number(raw) : null }));
          }}
        />
      </View>

      <Text style={styles.fieldLabel}>חדרים</Text>
      <View style={styles.pillRow}>
        {FEED_ROOM_FILTER_OPTIONS.map((o) => (
          <Pressable
            key={o.id || "all"}
            style={[styles.pill, roomId === o.id && styles.pillOn]}
            onPress={() => {
              const rooms = feedSearchFiltersFromRoomId(o.id);
              setDraft((prev) => ({ ...prev, ...rooms }));
            }}
          >
            <Text style={styles.pillText}>{o.label}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.fieldLabel}>מיון</Text>
      <View style={styles.pillRow}>
        {FEED_SORT_OPTIONS.map((o) => (
          <Pressable
            key={o.id}
            style={[styles.pill, appliedSort === o.id && styles.pillOn]}
            onPress={() => onSortChange(o.id)}
          >
            <Text style={styles.pillText}>{o.label}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.fieldLabel}>מאפיינים</Text>
      <View style={styles.featurePillRow}>
        {FEED_FEATURE_FILTER_OPTIONS.map((opt) => {
          const on = draft.requiredFeatures.includes(opt.id);
          return (
            <Pressable
              key={opt.id}
              style={[styles.pill, on && styles.pillOn]}
              onPress={() =>
                setDraft((prev) => ({
                  ...prev,
                  requiredFeatures: toggleFeedRequiredFeature(prev.requiredFeatures, opt.id),
                }))
              }
            >
              <Text style={styles.pillText}>{opt.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable
        style={[styles.searchBtn, loading && styles.searchBtnDisabled]}
        disabled={loading}
        onPress={() => onSearch(draft)}
      >
        <Text style={styles.searchBtnText}>חיפוש</Text>
      </Pressable>

      {feedSearchFiltersIsActive(appliedFilters) ? (
        <Pressable style={styles.clearBtn} disabled={loading} onPress={() => onSearch(EMPTY_FEED_SEARCH_FILTERS)}>
          <Text style={styles.clearBtnText}>נקה סינון</Text>
        </Pressable>
      ) : null}

      {feedSearchFiltersIsActive(appliedFilters) ? (
        <Text style={styles.appliedHint}>
          {appliedFilters.location
            ? `פעיל: ${feedLocationFilterSummary(appliedFilters.location)}`
            : "סינון פעיל"}
          {priceSummary(appliedFilters) ? ` · ${priceSummary(appliedFilters)}` : ""}
          {feedRequiredFeaturesSummary(appliedFilters.requiredFeatures)
            ? ` · ${feedRequiredFeaturesSummary(appliedFilters.requiredFeatures)}`
            : ""}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 4,
  },
  fieldLabel: {
    marginTop: 10,
    textAlign: "right",
    fontSize: 13,
    fontWeight: "800",
    color: "#25313b",
  },
  fieldHint: {
    textAlign: "right",
    fontSize: 11,
    color: "#9aa3ab",
    marginBottom: 4,
  },
  pillRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
    marginTop: 6,
    paddingVertical: 2,
  },
  featurePillRow: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
    marginTop: 6,
    paddingVertical: 2,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: C.surfaceSoft,
  },
  pillOn: {
    backgroundColor: C.brandSoft,
    borderWidth: 1,
    borderColor: BRAND_BORDER,
  },
  pillText: {
    fontSize: 13,
    fontWeight: "700",
    color: C.foreground,
  },
  priceRow: {
    flexDirection: "row-reverse",
    gap: 10,
    marginTop: 6,
  },
  priceInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "rgba(16,24,32,0.12)",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#fff",
    fontSize: 15,
  },
  searchBtn: {
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 999,
    backgroundColor: C.brand,
    alignItems: "center",
    shadowColor: "rgba(0, 157, 224, 0.35)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 2,
  },
  searchBtnDisabled: {
    opacity: 0.55,
  },
  searchBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
  },
  clearBtn: {
    marginTop: 10,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: C.brandSoft,
    alignItems: "center",
  },
  clearBtnText: {
    color: C.brand,
    fontWeight: "700",
    fontSize: 15,
  },
  appliedHint: {
    marginTop: 12,
    textAlign: "right",
    fontSize: 13,
    color: C.brand,
    fontWeight: "600",
  },
});
