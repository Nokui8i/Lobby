import { normalizeListingContactPhone } from "./listingContactPhone";
import { publishRoomOptionIdFromRooms } from "./feedFilters";
import type { PropertyFeature, RentalListing } from "./types";

export function parseListingEntryForForm(entryDate: string): {
  entryImmediate: boolean;
  entryDateIso: string;
} {
  const trimmed = entryDate.trim();
  const todayIso = new Date().toISOString().slice(0, 10);

  if (!trimmed || trimmed === "מיידי") {
    return { entryImmediate: true, entryDateIso: todayIso };
  }

  const isoMatch = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
  if (isoMatch) {
    return { entryImmediate: false, entryDateIso: isoMatch[1] };
  }

  return { entryImmediate: false, entryDateIso: todayIso };
}

export interface ListingPublishFormSeed {
  title: string;
  contactPhone: string;
  city: string;
  neighborhood: string;
  streetLine: string;
  houseNumber: string;
  propertyTypeId: string;
  propertyConditionId: string;
  priceIls: string;
  roomsOptionId: string;
  sizeSqm: string;
  floor: string;
  totalFloors: string;
  entryImmediate: boolean;
  entryDateIso: string;
  description: string;
  features: PropertyFeature[];
  galleryUrls: string[];
  video?: { url: string; durationSeconds: number };
}

export function rentalListingToPublishFormSeed(listing: RentalListing): ListingPublishFormSeed {
  const entry = parseListingEntryForForm(listing.entryDate);

  return {
    title: listing.title,
    contactPhone: normalizeListingContactPhone(listing.publisher.contactPhone ?? ""),
    city: listing.city,
    neighborhood: listing.neighborhood,
    streetLine: listing.streetLine?.trim() || listing.streetHint.trim(),
    houseNumber: listing.houseNumber?.trim() || "",
    propertyTypeId: listing.propertyTypeId ?? "",
    propertyConditionId: listing.propertyConditionId ?? "",
    priceIls: String(listing.priceIls),
    roomsOptionId: publishRoomOptionIdFromRooms(listing.rooms),
    sizeSqm: String(listing.sizeSqm),
    floor: String(listing.floor),
    totalFloors: String(listing.totalFloors),
    entryImmediate: entry.entryImmediate,
    entryDateIso: entry.entryDateIso,
    description: listing.description,
    features: [...listing.features],
    galleryUrls: listing.gallery.length > 0 ? listing.gallery : [listing.imageUrl],
    video: listing.video,
  };
}
