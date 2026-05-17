const { HttpsError } = require("firebase-functions/v2/https");
const {
  isLobbyPlaceId,
  isLegacyPlaceId,
  searchLocationBank,
  searchStreetsOnly,
  searchCitiesOnly,
  searchStreetsInCity,
  resolveLobbyPlaceId,
  resolveStreetPublishContext,
} = require("./locationBank");
function assertPlacesInput(input) {
  if (typeof input !== "string") {
    throw new HttpsError("invalid-argument", "חסר טקסט חיפוש.");
  }
  const trimmed = input.trim();
  if (trimmed.length < 2) {
    throw new HttpsError("invalid-argument", "יש להקליד לפחות 2 תווים.");
  }
  if (trimmed.length > 120) {
    throw new HttpsError("invalid-argument", "טקסט החיפוש ארוך מדי.");
  }
  return trimmed;
}

async function placesAutocompleteHandler(data) {
  const input = assertPlacesInput(data?.input);
  const mode = data?.mode === "streets" ? "streets" : "all";
  const suggestions = mode === "streets" ? searchStreetsOnly(input) : searchLocationBank(input);
  return { suggestions };
}

async function placesCitiesAutocompleteHandler(data) {
  const input = assertPlacesInput(data?.input);
  return { suggestions: searchCitiesOnly(input) };
}

async function placesStreetsByCityHandler(data) {
  const cityPlaceId = typeof data?.cityPlaceId === "string" ? data.cityPlaceId.trim() : "";
  if (!cityPlaceId || !isLobbyPlaceId(cityPlaceId)) {
    throw new HttpsError("invalid-argument", "חסר מזהה עיר.");
  }
  const input = assertPlacesInput(data?.input);
  return { suggestions: searchStreetsInCity(cityPlaceId, input) };
}

async function placesStreetContextHandler(data) {
  const streetPlaceId = typeof data?.streetPlaceId === "string" ? data.streetPlaceId.trim() : "";
  if (!streetPlaceId || !isLobbyPlaceId(streetPlaceId)) {
    throw new HttpsError("invalid-argument", "חסר מזהה רחוב.");
  }
  const context = await resolveStreetPublishContext(streetPlaceId);
  if (!context) {
    throw new HttpsError("invalid-argument", "הרחוב לא נמצא.");
  }
  return { context };
}

async function placesResolveHandler(data) {
  const placeId = typeof data?.placeId === "string" ? data.placeId.trim() : "";
  if (!placeId) {
    throw new HttpsError("invalid-argument", "חסר מזהה מיקום.");
  }

  if (isLobbyPlaceId(placeId)) {
    const resolved = resolveLobbyPlaceId(placeId);
    if (!resolved) {
      throw new HttpsError("invalid-argument", "המיקום לא נמצא.");
    }
    return { location: resolved };
  }

  if (isLegacyPlaceId(placeId)) {
    throw new HttpsError(
      "failed-precondition",
      "מיקום ישן — נא לבחור שוב עיר/רחוב מהרשימה (מאגר מפ\"י).",
    );
  }

  throw new HttpsError("invalid-argument", "מזהה מיקום לא תקין.");
}

module.exports = {
  placesAutocompleteHandler,
  placesCitiesAutocompleteHandler,
  placesStreetsByCityHandler,
  placesStreetContextHandler,
  placesResolveHandler,
};
