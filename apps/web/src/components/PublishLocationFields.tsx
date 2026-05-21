"use client";

import { useCallback, useEffect, useState } from "react";
import {
  buildPublishLocationFromStreet,
  LOCATION_FIELD_HELP_HE,
  publishContextFromStreet,
  type ResolvedLocation,
} from "@lobby/shared";
import { bubble } from "@/components/bubble/styles";
import { cn } from "@/lib/utils";
import { isFirebaseConfigured } from "@/lib/firebase/isConfigured";
import { lobbyPlacesStreetContext } from "@/lib/firebase/places";
import { LocationSearchInput } from "./LocationSearchInput";

export function PublishLocationFields({
  value,
  onChange,
  disabled = false,
  compact = false,
}: {
  value: ResolvedLocation | null;
  onChange: (location: ResolvedLocation | null) => void;
  disabled?: boolean;
  compact?: boolean;
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
    <div className={cn("flex flex-col direction-rtl", compact ? "gap-2" : "gap-3.5")}>
      <LocationSearchInput
        label="רחוב"
        placeholder="הקלידו שם רחוב ועיר…"
        required
        variant="publish"
        compact={compact}
        value={street}
        onChange={onStreetChange}
        disabled={disabled}
      />

      {street && street.kind === "street" ? (
        <ReadOnlyField
          label="עיר"
          value={street.cityLabel}
          help={LOCATION_FIELD_HELP_HE.officialLocked}
          compact={compact}
        />
      ) : null}

      {streetPickError ? <p className="m-0 text-[13px] text-red-700">{streetPickError}</p> : null}
    </div>
  );
}

function ReadOnlyField({
  label,
  value,
  help,
  compact = false,
}: {
  label: string;
  value: string;
  help: string;
  compact?: boolean;
}) {
  return (
    <div className={cn("flex flex-col", compact ? "gap-1" : "gap-1.5")}>
      <span className={cn(bubble.label, compact && "text-[13px]")}>{label}</span>
      <input
        className={cn(
          bubble.input,
          compact && "h-11 rounded-xl px-4 text-[15px]",
          "bg-[#F5FAFC] text-[#4a5560]",
        )}
        value={value}
        readOnly
        disabled
      />
      <p className={cn("m-0 text-[#a3aed0]", compact ? "text-[11px]" : "text-[13px]")}>{help}</p>
    </div>
  );
}
