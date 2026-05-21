import { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import {
  buildPublishLocationFromStreet,
  LOCATION_FIELD_HELP_HE,
  publishContextFromStreet,
  type ResolvedLocation,
} from "@lobby/shared";
import { LocationSearchInput } from "./LocationSearchInput";
import { isFirebaseConfigured } from "./lib/firebase/isConfigured";
import { lobbyPlacesStreetContext } from "./lib/firebase/places";

export function PublishLocationFields({
  value,
  onChange,
  disabled = false,
}: {
  value: ResolvedLocation | null;
  onChange: (location: ResolvedLocation | null) => void;
  disabled?: boolean;
}) {
  const [street, setStreet] = useState<ResolvedLocation | null>(null);
  const [streetPickError, setStreetPickError] = useState<string | null>(null);

  useEffect(() => {
    if (!value || value.kind !== "street") {
      return;
    }
    if (value.placeId === street?.placeId) {
      return;
    }
    setStreet(value);
    setStreetPickError(null);
  }, [value, street?.placeId]);

  const emitFromStreet = useCallback(
    (streetResolved: ResolvedLocation, ctxExtras?: ReturnType<typeof publishContextFromStreet>) => {
      const ctx = ctxExtras ?? publishContextFromStreet(streetResolved);
      onChange(buildPublishLocationFromStreet(streetResolved, ctx));
    },
    [onChange],
  );

  useEffect(() => {
    if (!street || street.kind !== "street") {
      onChange(null);
      return;
    }
    emitFromStreet(street);

    if (!isFirebaseConfigured()) {
      return;
    }
    void lobbyPlacesStreetContext(street.placeId)
      .then((ctx) => {
        emitFromStreet(street, {
          districtLabel: ctx.districtLabel,
          areaPlaceId: ctx.areaPlaceId,
          areaLabel: ctx.areaLabel,
          neighborhoodLabel: "",
          neighborhoodSource: "none",
        });
      })
      .catch(() => {});
  }, [street, emitFromStreet, onChange]);

  const onStreetChange = useCallback(
    (next: ResolvedLocation | null) => {
      if (next && next.kind !== "street") {
        setStreet(null);
        onChange(null);
        setStreetPickError("נא לבחור רחוב מהרשימה — לא עיר, שכונה או מחוז.");
        return;
      }
      setStreetPickError(null);
      setStreet(next);
      if (!next) {
        onChange(null);
      }
    },
    [onChange],
  );

  return (
    <View style={styles.stack}>
      <LocationSearchInput
        label="רחוב"
        placeholder="הקלידו שם רחוב ועיר…"
        value={street}
        onChange={onStreetChange}
        disabled={disabled}
        variant="publish"
      />
      {street && street.kind === "street" ? (
        <ReadOnly label="עיר" value={street.cityLabel} help={LOCATION_FIELD_HELP_HE.officialLocked} />
      ) : null}
      {streetPickError ? <Text style={styles.error}>{streetPickError}</Text> : null}
    </View>
  );
}

function ReadOnly({ label, value, help }: { label: string; value: string; help: string }) {
  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <TextInput style={[styles.input, styles.locked]} value={value} editable={false} />
      <Text style={styles.hint}>{help}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 12 },
  label: { fontSize: 14, fontWeight: "800", textAlign: "right", color: "#25313b" },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: "rgba(16,24,32,0.12)",
    borderRadius: 14,
    paddingHorizontal: 14,
    fontSize: 15,
    backgroundColor: "#fff",
  },
  locked: { backgroundColor: "#f4f6f8", color: "#4a5560" },
  hint: { fontSize: 12, color: "#64748b", textAlign: "right", marginTop: 4 },
  error: { fontSize: 12, color: "#b91c1c", textAlign: "right", marginTop: 4 },
});
