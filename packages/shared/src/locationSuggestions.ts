import type { LocationKind, LocationSuggestion } from "./location";
import { LOCATION_KIND_SECTION_HE } from "./location";

/** סדר קבוצות בתפריט ההשלמה (כמו יד2: עיר → שכונה → רחוב) */
export const LOCATION_SUGGESTION_KIND_ORDER: LocationKind[] = [
  "city",
  "area",
  "neighborhood",
  "street",
];

export const LOCATION_STREET_SECTION_NOTICE_HE =
  "בחירה ברחוב מציגה מודעות ברחוב בלבד — לא ניתן לשלב עם מיקום נוסף.";

function secondaryParts(item: LocationSuggestion): string[] {
  return item.secondaryText
    .split(/\s*·\s*/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/** שורה ראשית מודגשת — למשל "הילדים, קרית מוצקין" */
export function locationSuggestionDisplayTitle(item: LocationSuggestion): string {
  const parts = secondaryParts(item);
  const cityPart = parts[0] ?? "";

  if (item.kind === "city" || item.kind === "area") {
    return item.primaryText;
  }
  if (cityPart) {
    return `${item.primaryText}, ${cityPart}`;
  }
  return item.primaryText;
}

/** שורת משנה — מחוז / אזור */
export function locationSuggestionDisplaySubtitle(item: LocationSuggestion): string {
  const parts = secondaryParts(item);
  if (item.kind === "city" || item.kind === "area") {
    return parts[0] ?? item.secondaryText;
  }
  if (parts.length > 1) {
    return parts.slice(1).join(" · ");
  }
  return "";
}

export interface LocationSuggestionGroup {
  kind: LocationKind;
  label: string;
  items: LocationSuggestion[];
}

export function groupLocationSuggestionsByKind(
  items: LocationSuggestion[],
): LocationSuggestionGroup[] {
  const byKind = new Map<LocationKind, LocationSuggestion[]>();
  for (const item of items) {
    const list = byKind.get(item.kind) ?? [];
    list.push(item);
    byKind.set(item.kind, list);
  }
  return LOCATION_SUGGESTION_KIND_ORDER.filter((kind) => (byKind.get(kind)?.length ?? 0) > 0).map(
    (kind) => ({
      kind,
      label: LOCATION_KIND_SECTION_HE[kind],
      items: byKind.get(kind)!,
    }),
  );
}
