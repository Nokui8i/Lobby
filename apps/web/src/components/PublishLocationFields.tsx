"use client";

import { useCallback, useEffect, useState } from "react";
import {
  buildPublishLocationFromStreet,
  LOCATION_FIELD_HELP_HE,
  publishContextFromStreet,
  type ResolvedLocation,
} from "@lobby/shared";
import { isFirebaseConfigured } from "@/lib/firebase/isConfigured";
import { lobbyPlacesStreetContext } from "@/lib/firebase/places";
import { LocationSearchInput } from "./LocationSearchInput";
import styles from "./PublishLocationFields.module.css";

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
      if (!street) {
        return;
      }
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
      .catch(() => {
        /* אזור/מחוז כבר מולאו מ-publishContextFromStreet */
      });
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
    <div className={styles.stack}>
      <LocationSearchInput
        label="רחוב"
        placeholder="הקלידו שם רחוב ועיר…"
        required
        variant="publish"
        value={street}
        onChange={onStreetChange}
        disabled={disabled}
      />

      {street && street.kind === "street" ? (
        <ReadOnlyField label="עיר" value={street.cityLabel} help={LOCATION_FIELD_HELP_HE.officialLocked} />
      ) : null}

      {streetPickError ? <p className={styles.error}>{streetPickError}</p> : null}
    </div>
  );
}

function ReadOnlyField({
  label,
  value,
  help,
}: {
  label: string;
  value: string;
  help: string;
}) {
  return (
    <div className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      <input className={`${styles.input} ${styles.inputLocked}`} value={value} readOnly disabled />
      <p className={styles.hint}>{help}</p>
    </div>
  );
}
