import { getFunctions, httpsCallable } from "firebase/functions";
import type { LocationSuggestion, ResolvedLocation, StreetPublishContext } from "@lobby/shared";
import { getFirebaseApp } from "./client";

function getLobbyFunctions() {
  return getFunctions(getFirebaseApp(), "us-central1");
}

export async function lobbyPlacesAutocomplete(
  input: string,
  sessionToken: string,
  mode: "all" | "streets" = "all",
): Promise<LocationSuggestion[]> {
  const fn = httpsCallable<
    { input: string; sessionToken: string; mode?: "all" | "streets" },
    { suggestions: LocationSuggestion[] }
  >(getLobbyFunctions(), "lobbyPlacesAutocomplete");
  const result = await fn({ input, sessionToken, mode });
  return Array.isArray(result.data.suggestions) ? result.data.suggestions : [];
}

export async function lobbyPlacesResolve(
  placeId: string,
  sessionToken: string,
): Promise<ResolvedLocation> {
  const fn = httpsCallable<{ placeId: string; sessionToken: string }, { location: ResolvedLocation }>(
    getLobbyFunctions(),
    "lobbyPlacesResolve",
  );
  const result = await fn({ placeId, sessionToken });
  if (!result.data?.location?.placeId) {
    throw new Error("resolve_failed");
  }
  return result.data.location;
}

export async function lobbyPlacesCitiesAutocomplete(
  input: string,
  sessionToken: string,
): Promise<LocationSuggestion[]> {
  const fn = httpsCallable<{ input: string; sessionToken: string }, { suggestions: LocationSuggestion[] }>(
    getLobbyFunctions(),
    "lobbyPlacesCitiesAutocomplete",
  );
  const result = await fn({ input, sessionToken });
  return Array.isArray(result.data.suggestions) ? result.data.suggestions : [];
}

export async function lobbyPlacesStreetsByCity(
  cityPlaceId: string,
  input: string,
  sessionToken: string,
): Promise<LocationSuggestion[]> {
  const fn = httpsCallable<
    { cityPlaceId: string; input: string; sessionToken: string },
    { suggestions: LocationSuggestion[] }
  >(getLobbyFunctions(), "lobbyPlacesStreetsByCity");
  const result = await fn({ cityPlaceId, input, sessionToken });
  return Array.isArray(result.data.suggestions) ? result.data.suggestions : [];
}

export async function lobbyPlacesStreetContext(
  streetPlaceId: string,
): Promise<StreetPublishContext> {
  const fn = httpsCallable<{ streetPlaceId: string }, { context: StreetPublishContext }>(
    getLobbyFunctions(),
    "lobbyPlacesStreetContext",
  );
  const result = await fn({ streetPlaceId });
  if (!result.data?.context?.street?.placeId) {
    throw new Error("context_failed");
  }
  return result.data.context;
}
