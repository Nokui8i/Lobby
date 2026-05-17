import type { RentalListing } from '@lobby/shared';

export type FeedListing = RentalListing & { feedKey: string };

export type ChatRoute = null | { kind: 'list' } | { kind: 'thread'; threadId: string };

export type MainTab = 'messages' | 'home' | 'search' | 'upload';

export function createFirestoreFeed(listings: RentalListing[]): FeedListing[] {
  return listings.map((listing) => ({
    ...listing,
    feedKey: `${listing.id}-feed-firestore`,
  }));
}
