import { collection, deleteField, doc, serverTimestamp, setDoc, Timestamp, updateDoc } from "firebase/firestore";
import { getDownloadURL, getStorage, ref, uploadBytes } from "firebase/storage";
import type { ListingVideo, PropertyFeature, ResolvedLocation } from "@lobby/shared";
import {
  LISTINGS_COLLECTION,
  listingLocationToFirestoreRecord,
  listingPublisherFirestoreRecord,
} from "@lobby/shared";
import { getFirebaseApp, getFirestoreDb } from "./client";

export function newListingDocumentId(): string {
  const db = getFirestoreDb();
  return doc(collection(db, LISTINGS_COLLECTION)).id;
}

/** ברירת מחדל active. EXPO_PUBLIC_LOBBY_STRICT_DRAFT_PUBLISH=true → טיוטה בלבד. */
export function listingPublishStatusForNewSave(): "draft" | "active" {
  if (process.env.EXPO_PUBLIC_LOBBY_STRICT_DRAFT_PUBLISH === "true") {
    return "draft";
  }
  return "active";
}

function extFromMime(mime: string | undefined | null, fallback: string): string {
  if (!mime) {
    return fallback;
  }
  const m = mime.toLowerCase();
  if (m.includes("jpeg") || m.includes("jpg")) {
    return "jpg";
  }
  if (m.includes("png")) {
    return "png";
  }
  if (m.includes("webp")) {
    return "webp";
  }
  if (m.includes("mp4")) {
    return "mp4";
  }
  if (m.includes("quicktime")) {
    return "mov";
  }
  return fallback;
}

async function blobFromUri(uri: string): Promise<Blob> {
  const response = await fetch(uri);
  if (!response.ok) {
    throw new Error("READ_MEDIA");
  }
  return response.blob();
}

export async function uploadListingImageFromUri(
  userId: string,
  listingId: string,
  asset: { uri: string; mimeType?: string | null },
  index: number,
): Promise<string> {
  const blob = await blobFromUri(asset.uri);
  const storage = getStorage(getFirebaseApp());
  const ext = extFromMime(asset.mimeType, "jpg");
  const objectPath = `listing-media/${userId}/${listingId}/img-${index}-${Date.now()}.${ext}`;
  const storageRef = ref(storage, objectPath);
  const contentType = asset.mimeType?.startsWith("image/") ? asset.mimeType : "image/jpeg";
  await uploadBytes(storageRef, blob, { contentType });
  return getDownloadURL(storageRef);
}

export async function uploadListingVideoFromUri(
  userId: string,
  listingId: string,
  asset: { uri: string; mimeType?: string | null },
): Promise<string> {
  const blob = await blobFromUri(asset.uri);
  const storage = getStorage(getFirebaseApp());
  const ext = extFromMime(asset.mimeType, "mp4");
  const objectPath = `listing-media/${userId}/${listingId}/vid-${Date.now()}.${ext}`;
  const storageRef = ref(storage, objectPath);
  const contentType = asset.mimeType?.startsWith("video/") ? asset.mimeType : "video/mp4";
  await uploadBytes(storageRef, blob, { contentType });
  return getDownloadURL(storageRef);
}

export interface SaveListingDraftInput {
  listingId: string;
  publisherId: string;
  publisherDisplayName: string;
  title: string;
  location: ResolvedLocation;
  houseNumber: string;
  propertyTypeId: string;
  propertyTypeLabel: string;
  propertyConditionId: string;
  propertyConditionLabel: string;
  priceIls: number;
  rooms: number;
  sizeSqm: number;
  floor: number;
  totalFloors: number;
  entryDate: string;
  description: string;
  features: PropertyFeature[];
  galleryUrls: string[];
  video?: ListingVideo;
}

export async function saveListingDraft(input: SaveListingDraftInput): Promise<void> {
  const db = getFirestoreDb();
  const listingRef = doc(db, LISTINGS_COLLECTION, input.listingId);
  const expiresAt = Timestamp.fromMillis(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const locationFields = listingLocationToFirestoreRecord(input.location, input.houseNumber);

  await setDoc(listingRef, {
    title: input.title.trim(),
    ...locationFields,
    propertyTypeId: input.propertyTypeId.trim(),
    propertyTypeLabel: input.propertyTypeLabel.trim(),
    propertyConditionId: input.propertyConditionId.trim(),
    propertyConditionLabel: input.propertyConditionLabel.trim(),
    priceIls: input.priceIls,
    rooms: input.rooms,
    sizeSqm: input.sizeSqm,
    floor: input.floor,
    totalFloors: input.totalFloors,
    entryDate: input.entryDate.trim(),
    imageUrl: input.galleryUrls[0],
    gallery: input.galleryUrls,
    ...(input.video ? { video: input.video } : {}),
    features: input.features,
    description: input.description.trim(),
    status: listingPublishStatusForNewSave(),
    publishedAt: serverTimestamp(),
    expiresAt,
    publisherId: input.publisherId,
    publisher: listingPublisherFirestoreRecord({
      publisherId: input.publisherId,
      publisherDisplayName: input.publisherDisplayName,
      contactPhone: input.contactPhone,
    }),
  });
}

export interface UpdateListingInput extends SaveListingDraftInput {
  removeVideo?: boolean;
}

export async function updateListing(input: UpdateListingInput): Promise<void> {
  const db = getFirestoreDb();
  const listingRef = doc(db, LISTINGS_COLLECTION, input.listingId);
  const locationFields = listingLocationToFirestoreRecord(input.location, input.houseNumber);

  const patch: Record<string, unknown> = {
    title: input.title.trim(),
    ...locationFields,
    propertyTypeId: input.propertyTypeId.trim(),
    propertyTypeLabel: input.propertyTypeLabel.trim(),
    propertyConditionId: input.propertyConditionId.trim(),
    propertyConditionLabel: input.propertyConditionLabel.trim(),
    priceIls: input.priceIls,
    rooms: input.rooms,
    sizeSqm: input.sizeSqm,
    floor: input.floor,
    totalFloors: input.totalFloors,
    entryDate: input.entryDate.trim(),
    imageUrl: input.galleryUrls[0],
    gallery: input.galleryUrls,
    features: input.features,
    description: input.description.trim(),
    publisher: listingPublisherFirestoreRecord({
      publisherId: input.publisherId,
      publisherDisplayName: input.publisherDisplayName,
      contactPhone: input.contactPhone,
    }),
  };

  if (input.removeVideo) {
    patch.video = deleteField();
  } else if (input.video) {
    patch.video = input.video;
  }

  await updateDoc(listingRef, patch);
}
