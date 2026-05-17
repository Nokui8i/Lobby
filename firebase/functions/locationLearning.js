const { getFirestore, FieldValue } = require("firebase-admin/firestore");

const MIN_REPORTS_FOR_PENDING = 2;
const AUTO_APPROVE_REPORTS = 5;
const MANUAL_LABEL_MIN = 2;
const MANUAL_LABEL_MAX = 48;

function normalizeLabel(label) {
  return String(label ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[\"'״׳]/g, "")
    .toLowerCase();
}

function isValidManualLabel(label) {
  const trimmed = String(label ?? "").trim();
  if (trimmed.length < MANUAL_LABEL_MIN || trimmed.length > MANUAL_LABEL_MAX) {
    return false;
  }
  if (/https?:\/\//i.test(trimmed) || /www\./i.test(trimmed)) {
    return false;
  }
  if (/^\d+$/.test(trimmed)) {
    return false;
  }
  return true;
}

function candidateDocId(cityPlaceId, neighborhoodLabel) {
  return `${cityPlaceId}_${normalizeLabel(neighborhoodLabel)}`.slice(0, 500);
}

function slugForId(text) {
  return String(text ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[\"'״׳]/g, "")
    .replace(/[^\p{L}\p{N}-]+/gu, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

function learnedHoodId(citySemel, neighborhoodLabel) {
  const slug = slugForId(neighborhoodLabel) || "hood";
  return `il-hood-learned-${citySemel}-${slug}`;
}

/**
 * @param {{ streetPlaceId: string, cityPlaceId: string, citySemel: string, cityLabel: string, neighborhoodLabel: string, areaLabel: string, districtLabel: string, publisherId: string }} input
 */
async function recordNeighborhoodHint(input) {
  const label = String(input.neighborhoodLabel ?? "").trim();
  if (!isValidManualLabel(label)) {
    return { ok: false, reason: "invalid_label" };
  }

  const db = getFirestore();
  const streetRef = db.collection("streetNeighborhoodHints").doc(input.streetPlaceId);
  const candidateRef = db.collection("neighborhoodCandidates").doc(
    candidateDocId(input.cityPlaceId, label),
  );

  const norm = normalizeLabel(label);

  await db.runTransaction(async (tx) => {
    const streetSnap = await tx.get(streetRef);
    const streetData = streetSnap.exists ? streetSnap.data() : {};
    const labelCounts = { ...(streetData.labelCounts ?? {}) };
    labelCounts[norm] = (labelCounts[norm] ?? 0) + 1;
    const top = Object.entries(labelCounts).sort((a, b) => b[1] - a[1])[0];
    const topLabel = top?.[0] ?? norm;
    const topCount = top?.[1] ?? 1;

    tx.set(
      streetRef,
      {
        cityPlaceId: input.cityPlaceId,
        citySemel: input.citySemel,
        neighborhoodLabel: label,
        labelCounts,
        topLabelKey: topLabel,
        topCount,
        reportCount: FieldValue.increment(1),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    const candSnap = await tx.get(candidateRef);
    const cand = candSnap.exists ? candSnap.data() : {};
    const publisherIds = new Set(cand.publisherIds ?? []);
    publisherIds.add(input.publisherId);
    const streetIds = new Set(cand.streetPlaceIds ?? []);
    streetIds.add(input.streetPlaceId);
    const reportCount = (cand.reportCount ?? 0) + 1;

    let status = cand.status ?? "collecting";
    if (status === "collecting" && reportCount >= MIN_REPORTS_FOR_PENDING) {
      status = "pending";
    }
    if (status === "pending" && reportCount >= AUTO_APPROVE_REPORTS) {
      status = "approved";
    }

    tx.set(
      candidateRef,
      {
        cityPlaceId: input.cityPlaceId,
        citySemel: input.citySemel,
        cityLabel: input.cityLabel,
        name: label,
        nameKey: norm,
        areaLabel: input.areaLabel,
        districtLabel: input.districtLabel,
        reportCount,
        publisherIds: [...publisherIds].slice(0, 50),
        streetPlaceIds: [...streetIds].slice(0, 100),
        status,
        updatedAt: FieldValue.serverTimestamp(),
        ...(candSnap.exists ? {} : { createdAt: FieldValue.serverTimestamp() }),
      },
      { merge: true },
    );

    if (status === "approved") {
      const learnedRef = db.collection("learnedNeighborhoods").doc(
        learnedHoodId(input.citySemel, label),
      );
      tx.set(
        learnedRef,
        {
          id: learnedHoodId(input.citySemel, label),
          name: label,
          cityPlaceId: input.cityPlaceId,
          citySemel: input.citySemel,
          cityLabel: input.cityLabel,
          areaLabel: input.areaLabel,
          districtLabel: input.districtLabel,
          status: "approved",
          reportCount,
          approvedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    }
  });

  return { ok: true };
}

async function getStreetHint(streetPlaceId) {
  const snap = await getFirestore().collection("streetNeighborhoodHints").doc(streetPlaceId).get();
  if (!snap.exists) {
    return null;
  }
  const data = snap.data();
  if ((data.topCount ?? 0) < 2) {
    return null;
  }
  return {
    neighborhoodLabel: data.neighborhoodLabel ?? "",
    reportCount: data.topCount ?? data.reportCount ?? 0,
  };
}

/** @type {Map<string, object[]> | null} */
let learnedCache = null;
let learnedCacheAt = 0;
const LEARNED_CACHE_MS = 5 * 60 * 1000;

async function getApprovedLearnedForCity(cityPlaceId) {
  const now = Date.now();
  if (!learnedCache || now - learnedCacheAt > LEARNED_CACHE_MS) {
    const snap = await getFirestore()
      .collection("learnedNeighborhoods")
      .where("status", "==", "approved")
      .limit(500)
      .get();
    learnedCache = new Map();
    for (const doc of snap.docs) {
      const row = doc.data();
      const key = row.cityPlaceId;
      if (!learnedCache.has(key)) {
        learnedCache.set(key, []);
      }
      learnedCache.get(key).push(row);
    }
    learnedCacheAt = now;
  }
  return learnedCache.get(cityPlaceId) ?? [];
}

module.exports = {
  MIN_REPORTS_FOR_PENDING,
  AUTO_APPROVE_REPORTS,
  isValidManualLabel,
  normalizeLabel,
  recordNeighborhoodHint,
  getStreetHint,
  getApprovedLearnedForCity,
  learnedHoodId,
};
