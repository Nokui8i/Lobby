import { collection, deleteField, doc, serverTimestamp, setDoc, Timestamp, updateDoc } from "firebase/firestore";
import { getDownloadURL, getStorage, ref, uploadBytes } from "firebase/storage";
import type { ListingVideo, PropertyFeature, ResolvedLocation } from "@lobby/shared";
import {
  LISTINGS_COLLECTION,
  listingLocationToFirestoreRecord,
  listingPublisherFirestoreRecord,
} from "@lobby/shared";
import { getFirebaseApp } from "./client";
import { getFirestoreDb } from "./client";

export function newListingDocumentId(): string {
  const db = getFirestoreDb();
  return doc(collection(db, LISTINGS_COLLECTION)).id;
}

/** ברירת מחדל: active (מופיע בפיד). רק כש־NEXT_PUBLIC_LOBBY_STRICT_DRAFT_PUBLISH=true — טיוטה בלבד (מצב תשלום/פרודקשן). */
export function listingPublishStatusForNewSave(): "draft" | "active" {
  if (process.env.NEXT_PUBLIC_LOBBY_STRICT_DRAFT_PUBLISH === "true") {
    return "draft";
  }
  return "active";
}

function extensionFromFile(file: File, fallback: string): string {
  const raw = file.name.split(".").pop();
  if (!raw) {
    return fallback;
  }
  const cleaned = raw.replace(/[^a-z0-9]/gi, "").toLowerCase();
  return cleaned.length > 0 ? cleaned : fallback;
}

export async function uploadListingImage(
  userId: string,
  listingId: string,
  file: File,
  index: number,
): Promise<string> {
  const storage = getStorage(getFirebaseApp());
  const ext = extensionFromFile(file, "jpg");
  const objectPath = `listing-media/${userId}/${listingId}/img-${index}-${Date.now()}.${ext}`;
  const storageRef = ref(storage, objectPath);
  const contentType = file.type && file.type.startsWith("image/") ? file.type : "image/jpeg";
  await uploadBytes(storageRef, file, { contentType });
  return getDownloadURL(storageRef);
}

export async function uploadListingVideo(userId: string, listingId: string, file: File): Promise<string> {
  const storage = getStorage(getFirebaseApp());
  const ext = extensionFromFile(file, "mp4");
  const objectPath = `listing-media/${userId}/${listingId}/vid-${Date.now()}.${ext}`;
  const storageRef = ref(storage, objectPath);
  const contentType = file.type && file.type.startsWith("video/") ? file.type : "video/mp4";
  await uploadBytes(storageRef, file, { contentType });
  return getDownloadURL(storageRef);
}

export interface SaveListingDraftInput {
  listingId: string;
  publisherId: string;
  publisherDisplayName: string;
  contactPhone: string;
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

/** עדכון מודעה קיימת — שומר סטטוס, תאריכי פרסום ותפוגה */
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
