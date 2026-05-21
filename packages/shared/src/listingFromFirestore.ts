import { listingPropertyConditionLabel, listingPropertyTypeLabel } from "./listingPublishOptions";
import type { NeighborhoodSource } from "./locationLearning";
import type { ListingStatus, PropertyFeature, RentalListing } from "./types";

const VALID_NEIGHBORHOOD_SOURCES = new Set<NeighborhoodSource>(["official", "learned", "manual", "none"]);

const VALID_STATUSES: ListingStatus[] = [
  "draft",
  "pending_review",
  "active",
  "frozen",
  "expired",
  "rented",
  "removed",
];

const VALID_FEATURES = new Set<PropertyFeature>([
  "parking",
  "elevator",
  "mamad",
  "balcony",
  "furnished",
  "pets",
  "renovated",
  "airConditioning",
]);

function timestampLikeToIso(value: unknown): string | null {
  if (typeof value === "string" && value.length > 0) {
    return value;
  }

  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;

  if (typeof record.toDate === "function") {
    try {
      const date = (record.toDate as () => Date)();

      if (date instanceof Date && !Number.isNaN(date.getTime())) {
        return date.toISOString();
      }
    } catch {
      /* ignore */
    }
  }

  if (typeof record.seconds === "number") {
    const nanos = typeof record.nanoseconds === "number" ? record.nanoseconds / 1e6 : 0;
    return new Date(record.seconds * 1000 + nanos).toISOString();
  }

  return null;
}

function toIso(value: unknown): string {
  return timestampLikeToIso(value) ?? "1970-01-01T00:00:00.000Z";
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asFeatures(value: unknown): PropertyFeature[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const out: PropertyFeature[] = [];

  for (const item of value) {
    if (typeof item === "string" && VALID_FEATURES.has(item as PropertyFeature)) {
      out.push(item as PropertyFeature);
    }
  }

  return out;
}

/**
 * ממפה מסמך Firestore (או payload גולמי) ל־RentalListing.
 * עובד גם בלי תלות ב־Firebase SDK (Timestamp כ־{ seconds } או עם toDate).
 */
export function listingFromFirestorePayload(
  docId: string,
  data: Record<string, unknown>,
): RentalListing | null {
  const title = asString(data.title);
  const city = asString(data.city);

  if (!title || !city) {
    return null;
  }

  const gallery = Array.isArray(data.gallery)
    ? data.gallery.filter((url): url is string => typeof url === "string")
    : [];

  const imageUrl = asString(data.imageUrl) || gallery[0] || "";

  if (!imageUrl) {
    return null;
  }

  const publisherRaw = data.publisher;

  if (!publisherRaw || typeof publisherRaw !== "object") {
    return null;
  }

  const publisherRecord = publisherRaw as Record<string, unknown>;
  const publisherIdField = asString(data.publisherId);
  const contactPhoneRaw = asString(publisherRecord.contactPhone, "");
  const publisher = {
    id: publisherIdField || asString(publisherRecord.id, "unknown"),
    displayName: asString(publisherRecord.displayName, "—"),
    responseTimeLabel: asString(publisherRecord.responseTimeLabel, "—"),
    ...(contactPhoneRaw ? { contactPhone: contactPhoneRaw } : {}),
  };

  const statusValue = asString(data.status, "draft");

  if (!VALID_STATUSES.includes(statusValue as ListingStatus)) {
    return null;
  }

  const status = statusValue as ListingStatus;

  const videoRaw = data.video;
  let video: RentalListing["video"];

  if (videoRaw && typeof videoRaw === "object") {
    const videoRecord = videoRaw as Record<string, unknown>;
    const url = asString(videoRecord.url);
    const durationSeconds = asNumber(videoRecord.durationSeconds, 0);

    if (url && durationSeconds > 0) {
      video = {
        url,
        durationSeconds,
        thumbnailUrl: asString(videoRecord.thumbnailUrl) || undefined,
      };
    }
  }

  const propertyTypeId = asString(data.propertyTypeId);
  const propertyConditionId = asString(data.propertyConditionId);

  return {
    id: docId,
    title,
    city,
    neighborhood: asString(data.neighborhood),
    placeId: asString(data.placeId) || undefined,
    locationKind:
      typeof data.locationKind === "string" &&
      ["city", "neighborhood", "street", "area"].includes(data.locationKind)
        ? (data.locationKind as RentalListing["locationKind"])
        : undefined,
    cityPlaceId: asString(data.cityPlaceId) || undefined,
    neighborhoodPlaceId: asString(data.neighborhoodPlaceId) || undefined,
    streetPlaceId: asString(data.streetPlaceId) || undefined,
    districtLabel: asString(data.districtLabel) || undefined,
    areaPlaceId: asString(data.areaPlaceId) || undefined,
    areaLabel: asString(data.areaLabel) || undefined,
    neighborhoodSource:
      typeof data.neighborhoodSource === "string" && VALID_NEIGHBORHOOD_SOURCES.has(data.neighborhoodSource as NeighborhoodSource)
        ? (data.neighborhoodSource as NeighborhoodSource)
        : undefined,
    lat: typeof data.lat === "number" && Number.isFinite(data.lat) ? data.lat : undefined,
    lng: typeof data.lng === "number" && Number.isFinite(data.lng) ? data.lng : undefined,
    streetHint: asString(data.streetHint),
    streetLine: asString(data.streetLine) || undefined,
    houseNumber: asString(data.houseNumber) || undefined,
    propertyTypeId: propertyTypeId || undefined,
    propertyTypeLabel: asString(data.propertyTypeLabel) || (propertyTypeId ? listingPropertyTypeLabel(propertyTypeId) : undefined),
    propertyConditionId: propertyConditionId || undefined,
    propertyConditionLabel:
      asString(data.propertyConditionLabel) ||
      (propertyConditionId ? listingPropertyConditionLabel(propertyConditionId) : undefined),
    priceIls: asNumber(data.priceIls),
    rooms: asNumber(data.rooms),
    sizeSqm: asNumber(data.sizeSqm),
    floor: asNumber(data.floor),
    totalFloors: asNumber(data.totalFloors),
    entryDate: asString(data.entryDate, "כניסה גמישה"),
    imageUrl,
    gallery: gallery.length > 0 ? gallery : [imageUrl],
    video,
    features: asFeatures(data.features),
    description: asString(data.description),
    status,
    publishedAt: toIso(data.publishedAt),
    expiresAt: toIso(data.expiresAt),
    moderationDraftNote: asString(data.moderationDraftNote) || undefined,
    moderationAction: asString(data.moderationAction) || undefined,
    publishRemainingMs:
      typeof data.publishRemainingMs === "number" && data.publishRemainingMs > 0
        ? data.publishRemainingMs
        : undefined,
    publisher,
  };
}
