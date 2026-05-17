"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { SavedListingSnapshot } from "@/lib/firebase/savedListings";
import {
  subscribeSavedListingIds,
  toggleSavedListing,
} from "@/lib/firebase/savedListings";
import { isFirebaseConfigured } from "@/lib/firebase/isConfigured";
import { useLobbyAuth } from "./LobbyAuthContext";

type SavedListingsContextValue = {
  savedIds: Set<string>;
  count: number;
  loading: boolean;
  isSaved: (listingId: string) => boolean;
  toggleSave: (snapshot: SavedListingSnapshot) => Promise<boolean | null>;
};

const SavedListingsContext = createContext<SavedListingsContextValue | null>(null);

export function SavedListingsProvider({ children }: { children: ReactNode }) {
  const { user } = useLobbyAuth();
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user || !isFirebaseConfigured()) {
      setSavedIds(new Set());
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = subscribeSavedListingIds(
      user.uid,
      (ids) => {
        setSavedIds(ids);
        setLoading(false);
      },
      () => {
        setSavedIds(new Set());
        setLoading(false);
      },
    );
    return () => unsub();
  }, [user]);

  const isSaved = useCallback((listingId: string) => savedIds.has(listingId), [savedIds]);

  const toggleSave = useCallback(
    async (snapshot: SavedListingSnapshot): Promise<boolean | null> => {
      if (!user || !isFirebaseConfigured()) {
        return null;
      }
      const currently = savedIds.has(snapshot.listingId);
      return toggleSavedListing(user.uid, snapshot, currently);
    },
    [savedIds, user],
  );

  const value = useMemo(
    () => ({
      savedIds,
      count: savedIds.size,
      loading,
      isSaved,
      toggleSave,
    }),
    [savedIds, loading, isSaved, toggleSave],
  );

  return <SavedListingsContext.Provider value={value}>{children}</SavedListingsContext.Provider>;
}

export function useSavedListings() {
  const ctx = useContext(SavedListingsContext);
  if (!ctx) {
    throw new Error("useSavedListings must be used within SavedListingsProvider");
  }
  return ctx;
}

export function useSavedListingsOptional() {
  return useContext(SavedListingsContext);
}
