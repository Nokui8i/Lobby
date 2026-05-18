const MS_DAY = 24 * 60 * 60 * 1000;
const LISTING_PUBLISH_MS = 30 * MS_DAY;

function timestampToMillis(value) {
  if (!value) {
    return 0;
  }
  if (typeof value.toMillis === "function") {
    return value.toMillis();
  }
  if (typeof value === "object" && typeof value.seconds === "number") {
    const nanos = typeof value.nanoseconds === "number" ? value.nanoseconds / 1e6 : 0;
    return value.seconds * 1000 + nanos;
  }
  return 0;
}

/** זמן פרסום שנותר (מילישניות) — נשמר בהחזרה לטיוטה / לפני אישור מחדש */
function computePublishRemainingMs(listing) {
  const stored =
    typeof listing.publishRemainingMs === "number" && listing.publishRemainingMs > 0
      ? listing.publishRemainingMs
      : 0;
  const status = String(listing.status ?? "");
  if (status === "active" || status === "frozen") {
    const expiresMs = timestampToMillis(listing.expiresAt);
    if (expiresMs > 0) {
      return Math.max(0, expiresMs - Date.now());
    }
    return LISTING_PUBLISH_MS;
  }
  if (stored > 0) {
    return stored;
  }
  return LISTING_PUBLISH_MS;
}

module.exports = {
  MS_DAY,
  LISTING_PUBLISH_MS,
  timestampToMillis,
  computePublishRemainingMs,
};
