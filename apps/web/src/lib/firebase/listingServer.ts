import "server-only";
import {
  LISTINGS_COLLECTION,
  getHomeFeedDemoListingById,
  isHomeFeedDemoEnabled,
  listingFromFirestorePayload,
  type RentalListing,
} from "@lobby/shared";

function decodeFirestoreValue(value: unknown): unknown {
  if (!value || typeof value !== "object") {
    return value;
  }

  const record = value as Record<string, unknown>;

  if ("stringValue" in record) {
    return record.stringValue;
  }
  if ("integerValue" in record) {
    return Number(record.integerValue);
  }
  if ("doubleValue" in record) {
    return record.doubleValue;
  }
  if ("booleanValue" in record) {
    return record.booleanValue;
  }
  if ("nullValue" in record) {
    return null;
  }
  if ("timestampValue" in record) {
    return record.timestampValue;
  }
  if ("arrayValue" in record) {
    const values = (record.arrayValue as { values?: unknown[] }).values ?? [];
    return values.map(decodeFirestoreValue);
  }
  if ("mapValue" in record) {
    const fields = (record.mapValue as { fields?: Record<string, unknown> }).fields ?? {};
    return decodeFirestoreFields(fields);
  }

  return value;
}

function decodeFirestoreFields(fields: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, raw] of Object.entries(fields)) {
    out[key] = decodeFirestoreValue(raw);
  }
  return out;
}

/** מודעה פעילה לציבור — לטעינה ראשונית מהשרת (ללא Auth). */
export async function fetchPublicActiveListingServer(listingId: string): Promise<RentalListing | null> {
  if (isHomeFeedDemoEnabled()) {
    const demo = getHomeFeedDemoListingById(listingId);
    if (demo) {
      return demo;
    }
  }

  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId || !listingId) {
    return null;
  }

  const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents/${LISTINGS_COLLECTION}/${encodeURIComponent(listingId)}`;

  try {
    const res = await fetch(url, { next: { revalidate: 30 } });
    if (!res.ok) {
      return null;
    }

    const json = (await res.json()) as { fields?: Record<string, unknown> };
    if (!json.fields) {
      return null;
    }

    const data = decodeFirestoreFields(json.fields);
    const listing = listingFromFirestorePayload(listingId, data);
    if (!listing || listing.status !== "active") {
      return null;
    }

    return listing;
  } catch {
    return null;
  }
}
