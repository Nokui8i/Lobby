import type { ListingStatus } from "./types";

export type AdminListingListStatusFilter = ListingStatus | "";

export interface AdminListingListFilters {
  status: AdminListingListStatusFilter;
  publisherId: string;
  listingId: string;
  search: string;
}

export const DEFAULT_ADMIN_LISTING_FILTERS: AdminListingListFilters = {
  status: "",
  publisherId: "",
  listingId: "",
  search: "",
};

export interface AdminListingRecord {
  id: string;
  title: string;
  city: string;
  neighborhood: string;
  priceIls: number;
  status: ListingStatus;
  statusLabel: string;
  publisherId: string;
  publisherEmail: string;
  publisherDisplayName: string;
  imageUrl: string;
  updatedAt: string;
  expiresAt: string;
  publishRemainingMs?: number;
  moderationDraftNote?: string;
  locationLine: string;
}

export interface AdminListingDetail extends AdminListingRecord {
  rooms: number;
  sizeSqm: number;
  floor: number;
  totalFloors: number;
  entryDate: string;
  description: string;
  propertyTypeId: string;
  propertyConditionId: string;
  features: string[];
  gallery: string[];
  moderationAction?: string;
}

export type AdminListingModerationAction = "approve" | "return_to_draft" | "remove";

export interface AdminListingUpdateInput {
  listingId: string;
  title: string;
  priceIls: number;
  rooms: number;
  sizeSqm: number;
  floor: number;
  totalFloors: number;
  entryDate: string;
  description: string;
  propertyTypeId: string;
  propertyConditionId: string;
}
