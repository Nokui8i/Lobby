import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, NativeScrollEvent, ScrollView } from 'react-native';
import {
  buildSupportChatRouteId,
  DEFAULT_FEED_SORT_ID,
  EMPTY_FEED_SEARCH_FILTERS,
  feedLocationFilterSummary,
  type FeedSearchFilters,
  type FeedSortId,
  type RentalListing,
  createFeedShuffleSeed,
  orderFeedForDisplay,
} from '@lobby/shared';
import { subscribeChatThreadsForUser, type ChatThreadSummary } from './lib/firebase/chat';
import { subscribeMySupportInquiries, type SupportInquirySummary } from './lib/firebase/supportInquiryThread';
import { messagesInboxUnreadTotal } from './lib/messagesInbox';
import { fetchActiveListingsFromFirestore, fetchListingByIdFromFirestore } from './lib/firebase/listingQueries';
import { getFirestoreDb, ensureFirestoreAuthReady } from './lib/firebase/client';
import { isFirebaseConfigured } from './lib/firebase/isConfigured';
import { useLobbyAuth } from './lib/LobbyAuthContext';
import { AccountScreen } from './AccountScreen';
import { NotificationsScreen } from './NotificationsScreen';
import { SettingsScreen } from './SettingsScreen';
import { ContactScreen } from './ContactScreen';
import { usePushNotificationRegistration } from './hooks/usePushNotificationRegistration';
import { useNotificationResponseNavigation } from './hooks/useNotificationResponseNavigation';
import { isMessagingNotificationKind } from '@lobby/shared';
import { subscribeMyNotifications } from './lib/firebase/notifications';
import { SavedListingsScreen } from './SavedListingsScreen';
import { PublishListingScreen } from './PublishListingScreen';
import { INITIAL_VISIBLE_LISTINGS, LISTINGS_LOAD_STEP } from './constants/homeFeed';
import { type ChatRoute, type FeedListing, type MainTab, createFirestoreFeed } from './navigation/types';
import { ChatListView } from './screens/ChatListScreen';
import { ChatThreadView } from './screens/ChatThreadScreen';
import { HomeScreen } from './screens/HomeScreen';

export default function App() {
  const { user, loading: authLoading, openAuthModal, signOutUser } = useLobbyAuth();
  const [pushRegisterTick, setPushRegisterTick] = useState(0);
  usePushNotificationRegistration(pushRegisterTick);
  useNotificationResponseNavigation(({ threadId, inquiryId }) => {
    const routeThreadId =
      threadId || (inquiryId ? buildSupportChatRouteId(inquiryId) : undefined);
    if (!routeThreadId) {
      return;
    }
    setNotificationsOpen(false);
    setAccountOpen(false);
    setPublishOpen(false);
    setContactOpen(false);
    setMainTab('messages');
    setChatRoute({ kind: 'thread', threadId: routeThreadId });
  });
  const [chatRoute, setChatRoute] = useState<ChatRoute>(null);
  const [selectedListing, setSelectedListing] = useState<RentalListing | null>(null);
  const [feedListings, setFeedListings] = useState<FeedListing[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [feedError, setFeedError] = useState(false);
  const [visibleListingCount, setVisibleListingCount] = useState(INITIAL_VISIBLE_LISTINGS);
  const [mainTab, setMainTab] = useState<MainTab>('home');
  const [messagesBadgeCount, setMessagesBadgeCount] = useState(0);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [appliedFeedFilters, setAppliedFeedFilters] = useState<FeedSearchFilters>(EMPTY_FEED_SEARCH_FILTERS);
  const [appliedFeedSort, setAppliedFeedSort] = useState<FeedSortId>(DEFAULT_FEED_SORT_ID);
  const [feedShuffleSeed, setFeedShuffleSeed] = useState(() => createFeedShuffleSeed());
  const [publishOpen, setPublishOpen] = useState(false);
  const [publishEditListingId, setPublishEditListingId] = useState<string | null>(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [contactListingId, setContactListingId] = useState<string | null>(null);
  const [savedOpen, setSavedOpen] = useState(false);
  const [notifUnread, setNotifUnread] = useState(0);
  const feedScrollRef = useRef<ScrollView | null>(null);

  function handleMainTabPress(tab: MainTab) {
    setMainTab(tab);
    if (tab === 'home') {
      setFilterModalVisible(false);
      setPublishOpen(false);
      setAccountOpen(false);
      setNotificationsOpen(false);
      setSettingsOpen(false);
      setSelectedListing(null);
      setChatRoute(null);
      feedScrollRef.current?.scrollTo({ y: 0, animated: true });
      return;
    }
    if (tab === 'messages') {
      setFilterModalVisible(false);
      setPublishOpen(false);
      setAccountOpen(false);
      if (authLoading) {
        return;
      }
      if (!user) {
        openAuthModal();
        return;
      }
      setChatRoute({ kind: 'list' });
      return;
    }
    if (tab === 'search') {
      setChatRoute(null);
      setPublishOpen(false);
      setAccountOpen(false);
      setFilterModalVisible(true);
      return;
    }
    if (tab === 'upload') {
      setFilterModalVisible(false);
      setChatRoute(null);
      setAccountOpen(false);
      setSelectedListing(null);
      if (authLoading || !isFirebaseConfigured()) {
        return;
      }
      if (!user) {
        openAuthModal();
        return;
      }
      setMainTab('upload');
      setPublishOpen(true);
      return;
    }
  }

  function requestSignOut() {
    Alert.alert('להתנתק מלובי?', 'לא תוכלו לשלוח הודעות או לפרסם עד שתתחברו שוב.', [
      { text: 'ביטול', style: 'cancel' },
      {
        text: 'להתנתק',
        style: 'destructive',
        onPress: () => {
          void signOutUser();
        },
      },
    ]);
  }

  const handleFeedScroll = (event: { nativeEvent: NativeScrollEvent }) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const distanceFromBottom = contentSize.height - (contentOffset.y + layoutMeasurement.height);

    if (distanceFromBottom < 420) {
      setVisibleListingCount((currentCount) =>
        Math.min(feedListings.length, currentCount + LISTINGS_LOAD_STEP),
      );
    }
  };

  useEffect(() => {
    let cancelled = false;

    async function loadFeed() {
      setFeedLoading(true);
      setFeedError(false);

      if (!isFirebaseConfigured()) {
        if (!cancelled) {
          setFeedListings([]);
          setVisibleListingCount(INITIAL_VISIBLE_LISTINGS);
        }
        setFeedLoading(false);
        return;
      }

      try {
        const remote = await fetchActiveListingsFromFirestore({
          maxListings: 96,
          feedFilters: appliedFeedFilters,
          feedSort: appliedFeedSort,
        });

        if (cancelled) {
          return;
        }

        const feed = createFirestoreFeed(remote);
        setFeedListings(feed);
        setVisibleListingCount(Math.min(INITIAL_VISIBLE_LISTINGS, feed.length));
        setFeedError(false);
      } catch {
        if (!cancelled) {
          setFeedListings([]);
          setFeedError(true);
          setVisibleListingCount(INITIAL_VISIBLE_LISTINGS);
        }
      } finally {
        if (!cancelled) {
          setFeedLoading(false);
        }
      }
    }

    void loadFeed();

    return () => {
      cancelled = true;
    };
  }, [appliedFeedFilters, appliedFeedSort]);

  useEffect(() => {
    if (!user || !isFirebaseConfigured()) {
      setMessagesBadgeCount(0);
      return;
    }

    let cancelled = false;
    let unsubscribeChat: (() => void) | undefined;
    let unsubscribeSupport: (() => void) | undefined;
    const supportRef: { current: SupportInquirySummary[] } = { current: [] };
    const chatsRef: { current: ChatThreadSummary[] } = { current: [] };

    const recomputeBadge = () => {
      if (!cancelled) {
        setMessagesBadgeCount(messagesInboxUnreadTotal(chatsRef.current, supportRef.current));
      }
    };

    void (async () => {
      try {
        await ensureFirestoreAuthReady(user);
      } catch {
        /* ignore */
      }

      if (cancelled) {
        return;
      }

      const db = getFirestoreDb();

      unsubscribeSupport = subscribeMySupportInquiries(
        db,
        user.uid,
        (rows) => {
          supportRef.current = rows;
          recomputeBadge();
        },
        () => {},
      );

      unsubscribeChat = subscribeChatThreadsForUser(
        db,
        user.uid,
        (rows) => {
          chatsRef.current = rows;
          recomputeBadge();
        },
        () => {},
      );
    })();

    return () => {
      cancelled = true;
      unsubscribeChat?.();
      unsubscribeSupport?.();
    };
  }, [user]);

  useEffect(() => {
    if (!user || !isFirebaseConfigured()) {
      setNotifUnread(0);
      return;
    }
    const unsub = subscribeMyNotifications(getFirestoreDb(), user.uid, (rows) => {
      setNotifUnread(rows.filter((r) => !r.read && !isMessagingNotificationKind(r.kind)).length);
    });
    return () => unsub();
  }, [user]);

  if (publishOpen) {
    return (
      <PublishListingScreen
        editListingId={publishEditListingId ?? undefined}
        onClose={() => {
          setPublishOpen(false);
          setPublishEditListingId(null);
          setMainTab('home');
        }}
        onPublished={(listingId) => {
          setPublishOpen(false);
          setPublishEditListingId(null);
          setMainTab('home');
          void fetchListingByIdFromFirestore(listingId).then((listing) => {
            if (listing) {
              setSelectedListing(listing);
            }
          });
        }}
      />
    );
  }

  if (contactOpen) {
    return (
      <ContactScreen
        initialListingId={contactListingId}
        onSubmitted={(inquiryId) => {
          setContactOpen(false);
          setContactListingId(null);
          setMainTab('messages');
          setChatRoute({ kind: 'thread', threadId: buildSupportChatRouteId(inquiryId) });
        }}
        onClose={() => {
          setContactOpen(false);
          setContactListingId(null);
          setSettingsOpen(true);
        }}
      />
    );
  }

  if (settingsOpen) {
    return (
      <SettingsScreen
        onClose={() => {
          setSettingsOpen(false);
          setAccountOpen(true);
        }}
        onOpenNotifications={() => {
          setSettingsOpen(false);
          setAccountOpen(false);
          setNotificationsOpen(true);
        }}
        onPushEnabled={() => setPushRegisterTick((t) => t + 1)}
      />
    );
  }

  if (notificationsOpen) {
    return (
      <NotificationsScreen
        onClose={() => {
          setNotificationsOpen(false);
          setAccountOpen(true);
        }}
        onOpenThread={(threadId) => {
          setNotificationsOpen(false);
          setAccountOpen(false);
          setChatRoute({ kind: 'thread', threadId });
        }}
        onOpenAccount={() => {
          setNotificationsOpen(false);
          setAccountOpen(true);
        }}
        onOpenListing={(listingId) => {
          setNotificationsOpen(false);
          setAccountOpen(false);
          void fetchListingByIdFromFirestore(listingId).then((listing) => {
            if (listing) {
              setSelectedListing(listing);
            }
          });
        }}
        onEditListing={(listingId) => {
          setNotificationsOpen(false);
          setAccountOpen(false);
          setPublishEditListingId(listingId);
          setPublishOpen(true);
        }}
        onOpenContact={() => {
          setNotificationsOpen(false);
          setAccountOpen(false);
          setContactListingId(null);
          setContactOpen(true);
        }}
        onOpenSupport={(inquiryId) => {
          setNotificationsOpen(false);
          setAccountOpen(false);
          setMainTab('messages');
          setChatRoute({ kind: 'thread', threadId: buildSupportChatRouteId(inquiryId) });
        }}
      />
    );
  }

  if (savedOpen) {
    return (
      <SavedListingsScreen
        onClose={() => {
          setSavedOpen(false);
          setMainTab('home');
        }}
        onOpenListing={(listing) => {
          setSavedOpen(false);
          setMainTab('home');
          setSelectedListing(listing);
        }}
      />
    );
  }

  if (accountOpen) {
    return (
      <AccountScreen
        notifUnread={notifUnread}
        onClose={() => {
          setAccountOpen(false);
          setMainTab('home');
        }}
        onOpenNotifications={() => {
          setNotificationsOpen(true);
        }}
        onOpenSettings={() => {
          setSettingsOpen(true);
        }}
        onOpenListing={(listing) => {
          setAccountOpen(false);
          setMainTab('home');
          setSelectedListing(listing);
        }}
        onEditListing={(listingId) => {
          setAccountOpen(false);
          setPublishEditListingId(listingId);
          setPublishOpen(true);
        }}
      />
    );
  }

  if (chatRoute?.kind === 'thread') {
    return (
      <ChatThreadView
        threadId={chatRoute.threadId}
        onBackToList={() => setChatRoute({ kind: 'list' })}
        onClose={() => {
          setChatRoute(null);
          setMainTab('home');
        }}
      />
    );
  }

  if (chatRoute?.kind === 'list') {
    return (
      <ChatListView
        mainTab={mainTab}
        messagesBadgeCount={messagesBadgeCount}
        onTabPress={handleMainTabPress}
        onOpenThread={(threadId) => setChatRoute({ kind: 'thread', threadId })}
        onClose={() => {
          setChatRoute(null);
          setMainTab('home');
        }}
      />
    );
  }

  const displayFeedListings = useMemo(
    () =>
      orderFeedForDisplay(
        feedListings,
        appliedFeedSort,
        appliedFeedSort === DEFAULT_FEED_SORT_ID ? feedShuffleSeed : null,
      ),
    [feedListings, appliedFeedSort, feedShuffleSeed],
  );

  const visibleListings = displayFeedListings.slice(0, visibleListingCount);
  const feedFilterSummary = appliedFeedFilters.location
    ? feedLocationFilterSummary(appliedFeedFilters.location)
    : '';

  useEffect(() => {
    setFeedShuffleSeed(createFeedShuffleSeed());
  }, [appliedFeedFilters, appliedFeedSort]);

  function applyFeedSearch(filters: FeedSearchFilters) {
    setAppliedFeedFilters(filters);
    setFeedShuffleSeed(createFeedShuffleSeed());
    setFilterModalVisible(false);
    setMainTab('home');
    feedScrollRef.current?.scrollTo({ y: 0, animated: true });
  }

  return (
    <HomeScreen
      user={user}
      authLoading={authLoading}
      selectedListing={selectedListing}
      feedListings={feedListings}
      visibleListings={visibleListings}
      feedLoading={feedLoading}
      feedError={feedError}
      appliedFeedFilters={appliedFeedFilters}
      appliedFeedSort={appliedFeedSort}
      feedFilterSummary={feedFilterSummary}
      mainTab={mainTab}
      messagesBadgeCount={messagesBadgeCount}
      filterModalVisible={filterModalVisible}
      feedScrollRef={feedScrollRef}
      openAuthModal={openAuthModal}
      requestSignOut={requestSignOut}
      onSelectListing={setSelectedListing}
      onClearListing={() => setSelectedListing(null)}
      onOpenThread={(threadId) => setChatRoute({ kind: 'thread', threadId })}
      onOpenSaved={() => {
        setSavedOpen(true);
        setPublishOpen(false);
        setChatRoute(null);
        setFilterModalVisible(false);
      }}
      onOpenAccount={() => {
        setAccountOpen(true);
        setPublishOpen(false);
        setChatRoute(null);
        setFilterModalVisible(false);
      }}
      onMainTabPress={handleMainTabPress}
      onFeedScroll={handleFeedScroll}
      onAppliedFeedSortChange={setAppliedFeedSort}
      onOpenPublish={() => {
        if (authLoading || !isFirebaseConfigured()) return;
        if (!user) {
          openAuthModal();
          return;
        }
        setMainTab('upload');
        setPublishOpen(true);
      }}
      onOpenFilterModal={() => {
        setFilterModalVisible(true);
        setMainTab('search');
      }}
      onCloseFilterModal={() => {
        setFilterModalVisible(false);
        setMainTab('home');
      }}
      onApplyFeedSearch={applyFeedSearch}
    />
  );
}
