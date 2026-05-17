import { deleteObject, getStorage, listAll, ref } from "firebase/storage";
import { getFirebaseApp } from "./client";

export async function deleteListingMediaFromStorage(publisherId: string, listingId: string): Promise<void> {
  const storage = getStorage(getFirebaseApp());
  const folderRef = ref(storage, `listing-media/${publisherId}/${listingId}`);
  const listing = await listAll(folderRef);

  if (listing.items.length === 0) {
    return;
  }

  await Promise.all(listing.items.map((itemRef) => deleteObject(itemRef)));
}
