import type { ListingStatus, RentalListing } from "./types";

const MS_DAY = 24 * 60 * 60 * 1000;
const EPOCH_ISO = "1970-01-01T00:00:00.000Z";

export type ListingPublishCountdownVariant = "running" | "paused" | "ending";

export interface ListingPublishCountdown {
  days: number;
  variant: ListingPublishCountdownVariant;
}

function isoToMs(iso: string | undefined): number | null {
  if (!iso || iso === EPOCH_ISO) {
    return null;
  }
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : null;
}

function ceilDaysFromMs(ms: number): number {
  return Math.max(0, Math.ceil(ms / MS_DAY));
}

export function getListingPublishCountdown(
  listing: Pick<
    RentalListing,
    "status" | "expiresAt" | "publishRemainingMs" | "moderationAction" | "moderationDraftNote"
  >,
  nowMs: number = Date.now(),
): ListingPublishCountdown | null {
  const savedMs =
    typeof listing.publishRemainingMs === "number" && listing.publishRemainingMs > 0
      ? listing.publishRemainingMs
      : null;

  if (listing.status === "pending_review" && savedMs != null) {
    return { days: ceilDaysFromMs(savedMs), variant: "paused" };
  }

  if (listing.status === "draft") {
    const moderationPaused =
      listing.moderationAction === "returned_to_draft" ||
      Boolean(listing.moderationDraftNote?.trim());
    if (moderationPaused && savedMs != null) {
      return { days: ceilDaysFromMs(savedMs), variant: "paused" };
    }
    const expiresMs = isoToMs(listing.expiresAt);
    if (expiresMs != null && expiresMs > nowMs) {
      return { days: ceilDaysFromMs(expiresMs - nowMs), variant: "running" };
    }
    return null;
  }

  if (listing.status === "active" || listing.status === "frozen") {
    const expiresMs = isoToMs(listing.expiresAt);
    if (expiresMs == null) {
      return null;
    }
    const remaining = expiresMs - nowMs;
    if (remaining <= 0) {
      return { days: 0, variant: "ending" };
    }
    return { days: ceilDaysFromMs(remaining), variant: "running" };
  }

  if (listing.status === "expired") {
    const expiresMs = isoToMs(listing.expiresAt);
    if (expiresMs == null) {
      return null;
    }
    const daysSince = ceilDaysFromMs(nowMs - expiresMs);
    if (daysSince <= 14) {
      return { days: Math.max(0, 14 - daysSince), variant: "ending" };
    }
    return null;
  }

  return null;
}

export function formatListingPublishCountdownHe(
  countdown: ListingPublishCountdown,
  status: ListingStatus,
): string {
  const { days, variant } = countdown;

  if (status === "expired" && variant === "ending") {
    if (days === 0) {
      return "תקופת החידוש הסתיימה";
    }
    if (days === 1) {
      return "ניתן לחדש עוד יום אחד";
    }
    return `ניתן לחדש עוד ${days} ימים`;
  }

  if (variant === "paused") {
    if (days === 0) {
      return "ימי פרסום נשמרו — הספירה מושהית";
    }
    if (days === 1) {
      return "נשמר יום פרסום אחד — הספירה מושהית";
    }
    return `נשמרו ${days} ימי פרסום — הספירה מושהית`;
  }

  if (variant === "ending" || days === 0) {
    return "פג תוקף הפרסום היום";
  }

  if (status === "frozen") {
    if (days === 1) {
      return "עוד יום בלוח (מוקפאת — הספירה ממשיכה)";
    }
    return `עוד ${days} ימים בלוח (מוקפאת — הספירה ממשיכה)`;
  }

  if (days === 1) {
    return "עוד יום אחד בלוח";
  }
  return `עוד ${days} ימים בלוח`;
}

export type ListingPublishCountdownInput = Pick<
  RentalListing,
  "status" | "expiresAt" | "publishRemainingMs" | "moderationAction" | "moderationDraftNote"
>;

/** תווית ספירה לאחור לאזור אישי — null אם לא רלוונטי */
export function listingPublishCountdownLabel(
  listing: ListingPublishCountdownInput,
  nowMs?: number,
): string | null {
  const countdown = getListingPublishCountdown(listing, nowMs);
  if (!countdown) {
    return null;
  }
  return formatListingPublishCountdownHe(countdown, listing.status);
}

/** ימים ≤ 3 — להדגשה ויזואלית */
export function listingPublishCountdownIsUrgent(
  listing: RentalListing,
  nowMs?: number,
): boolean {
  const countdown = getListingPublishCountdown(listing, nowMs);
  if (!countdown) {
    return false;
  }
  if (countdown.variant === "paused") {
    return false;
  }
  return countdown.days <= 3;
}
