import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  groupLocationSuggestionsByKind,
  locationSuggestionDisplaySubtitle,
  locationSuggestionDisplayTitle,
  resolvedLocationDisplayLine,
  type LocationSuggestion,
  type ResolvedLocation,
} from "@lobby/shared";
import { isFirebaseConfigured } from "./lib/firebase/isConfigured";
import {
  lobbyPlacesAutocomplete,
  lobbyPlacesCitiesAutocomplete,
  lobbyPlacesResolve,
  lobbyPlacesStreetsByCity,
} from "./lib/firebase/places";

function newSessionToken(): string {
  return `lobby-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function LocationSearchInput({
  label,
  value,
  onChange,
  disabled = false,
  required = true,
  variant = "publish",
  compact = false,
  searchMode = "all",
  cityPlaceId,
  placeholder = "עיר או רחוב",
}: {
  label: string;
  value: ResolvedLocation | null;
  onChange: (location: ResolvedLocation | null) => void;
  disabled?: boolean;
  required?: boolean;
  variant?: "publish" | "feed";
  compact?: boolean;
  searchMode?: "all" | "city" | "street";
  cityPlaceId?: string;
  placeholder?: string;
}) {
  const [query, setQuery] = useState("");
  const [sessionToken, setSessionToken] = useState(() => newSessionToken());
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (value) {
      setQuery(resolvedLocationDisplayLine(value));
    }
  }, [value]);

  const runSearch = useCallback(async (text: string, token: string) => {
    if (!isFirebaseConfigured()) {
      setError("אין חיבור לשרת.");
      setSuggestions([]);
      return;
    }
    if (text.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      let items: LocationSuggestion[];
      if (searchMode === "city") {
        items = await lobbyPlacesCitiesAutocomplete(text, token);
      } else if (searchMode === "street") {
        if (!cityPlaceId) {
          setSuggestions([]);
          return;
        }
        items = await lobbyPlacesStreetsByCity(cityPlaceId, text, token);
      } else if (variant === "publish") {
        items = await lobbyPlacesAutocomplete(text, token, "streets");
      } else {
        items = await lobbyPlacesAutocomplete(text, token);
      }
      setSuggestions(items);
      setOpen(true);
    } catch {
      setError("חיפוש כתובות לא זמין.");
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, [searchMode, cityPlaceId, variant]);

  const pickSuggestion = useCallback(
    async (item: LocationSuggestion) => {
      if (variant === "publish" && item.kind !== "street") {
        setError("נא לבחור רחוב מהרשימה — לא עיר, שכונה או מחוז.");
        return;
      }
      setLoading(true);
      try {
        const resolved = await lobbyPlacesResolve(item.placeId, sessionToken);
        if (variant === "publish" && resolved.kind !== "street") {
          setError("נא לבחור רחוב מהרשימה — לא עיר, שכונה או מחוז.");
          return;
        }
        onChange(resolved);
        setQuery(resolvedLocationDisplayLine(resolved));
        setOpen(false);
        setSuggestions([]);
        setSessionToken(newSessionToken());
      } catch {
        setError("לא ניתן לאשר את הכתובת.");
      } finally {
        setLoading(false);
      }
    },
    [onChange, sessionToken, variant],
  );

  const suggestionGroups =
    variant === "feed" && searchMode === "all"
      ? groupLocationSuggestionsByKind(suggestions)
      : null;

  return (
    <View style={styles.wrap}>
      {!compact ? (
        <Text style={styles.label}>
          {label}
          {required ? " *" : ""}
        </Text>
      ) : null}
      <TextInput
        style={styles.input}
        value={query}
        editable={!disabled}
        placeholder={placeholder}
        textAlign="right"
        onChangeText={(text) => {
          setQuery(text);
          if (value) {
            onChange(null);
          }
          if (debounceRef.current) {
            clearTimeout(debounceRef.current);
          }
          debounceRef.current = setTimeout(() => {
            void runSearch(text, sessionToken);
          }, 280);
        }}
        onFocus={() => {
          if (suggestions.length > 0) {
            setOpen(true);
          }
        }}
      />

      {value && !compact ? (
        <View style={styles.selected}>
          <Text style={styles.selectedTitle}>{value.primaryLabel}</Text>
          <Text style={styles.selectedMeta}>{value.secondaryLabel || value.cityLabel}</Text>
          <Pressable
            onPress={() => {
              onChange(null);
              setQuery("");
              setSessionToken(newSessionToken());
            }}
            disabled={disabled}
          >
            <Text style={styles.clear}>שינוי כתובת</Text>
          </Pressable>
        </View>
      ) : null}

      {open && !value && (loading || suggestions.length > 0) ? (
        <ScrollView style={styles.panel} keyboardShouldPersistTaps="handled" nestedScrollEnabled>
          {loading ? <Text style={styles.loading}>מחפשים…</Text> : null}
          {suggestionGroups
            ? suggestionGroups.map((group) => (
                <View key={group.kind}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionHeaderLabel}>{group.label}</Text>
                  </View>
                  {group.items.map((item) => {
                    const subtitle = locationSuggestionDisplaySubtitle(item);
                    return (
                      <Pressable
                        key={item.placeId}
                        style={styles.option}
                        onPress={() => void pickSuggestion(item)}
                      >
                        <Text style={styles.optionTitle}>{locationSuggestionDisplayTitle(item)}</Text>
                        {subtitle ? <Text style={styles.optionMeta}>{subtitle}</Text> : null}
                      </Pressable>
                    );
                  })}
                </View>
              ))
            : suggestions.map((item) => (
                <Pressable key={item.placeId} style={styles.option} onPress={() => void pickSuggestion(item)}>
                  <Text style={styles.optionTitle}>{locationSuggestionDisplayTitle(item)}</Text>
                  {locationSuggestionDisplaySubtitle(item) ? (
                    <Text style={styles.optionMeta}>{locationSuggestionDisplaySubtitle(item)}</Text>
                  ) : null}
                </Pressable>
              ))}
        </ScrollView>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {!compact && !value && !error ? (
        <Text style={styles.hint}>
          {variant === "publish"
            ? "רחוב בלבד — בחרו מהרשימה (שם רחוב + עיר)."
                : "בחרו עיר לכל המודעות בעיר, או רחוב ספציפי (למשל: הנביאים, תל אביב)."}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 12,
  },
  label: {
    textAlign: "right",
    fontSize: 13,
    fontWeight: "800",
    color: "#25313b",
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "rgba(16,24,32,0.12)",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    backgroundColor: "#fff",
  },
  selected: {
    marginTop: 8,
    padding: 10,
    borderRadius: 12,
    backgroundColor: "rgba(8,184,200,0.08)",
    borderWidth: 1,
    borderColor: "rgba(8,184,200,0.2)",
  },
  selectedTitle: {
    textAlign: "right",
    fontWeight: "800",
    color: "#202125",
  },
  selectedMeta: {
    marginTop: 4,
    textAlign: "right",
    color: "#64748b",
    fontSize: 13,
  },
  clear: {
    marginTop: 8,
    textAlign: "right",
    color: "#065a63",
    fontWeight: "700",
  },
  panel: {
    marginTop: 6,
    maxHeight: 220,
    borderWidth: 1,
    borderColor: "rgba(16,24,32,0.1)",
    borderRadius: 14,
    backgroundColor: "#fff",
  },
  sectionHeader: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#f4f5f6",
    borderTopWidth: 1,
    borderTopColor: "rgba(16,24,32,0.08)",
  },
  sectionHeaderLabel: {
    textAlign: "right",
    fontSize: 13,
    fontWeight: "800",
    color: "#64748b",
  },
  option: {
    paddingHorizontal: 12,
    paddingBottom: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(16,24,32,0.06)",
  },
  optionTitle: {
    textAlign: "right",
    fontWeight: "800",
    color: "#202125",
  },
  optionMeta: {
    textAlign: "right",
    color: "#64748b",
    fontSize: 13,
    marginTop: 2,
  },
  loading: {
    padding: 12,
    textAlign: "right",
    color: "#64748b",
  },
  hint: {
    marginTop: 6,
    textAlign: "right",
    fontSize: 12,
    color: "#64748b",
  },
  error: {
    marginTop: 6,
    textAlign: "right",
    fontSize: 12,
    color: "#b91c1c",
  },
  streetNotice: {
    marginTop: 6,
    textAlign: "right",
    fontSize: 11,
    lineHeight: 16,
    color: "#64748b",
    paddingHorizontal: 4,
  },
});
