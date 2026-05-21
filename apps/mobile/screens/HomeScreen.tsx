import { StatusBar } from 'expo-status-bar';
import type { RefObject } from 'react';
import {
  FEED_SORT_OPTIONS,
  feedSearchFiltersIsActive,
  type FeedSearchFilters,
  type FeedSortId,
  type RentalListing,
} from '@lobby/shared';
import {
  Modal,
  NativeScrollEvent,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { FeedSearchPanel } from '../FeedSearchPanel';
import { AppFooter } from '../components/AppFooter';
import { HomeFeedHero } from '../components/HomeFeedHero';
import { ListingCard } from '../components/ListingCard';
import { LobbyHomeHeader } from '../components/LobbyHomeHeader';
import { FloatingMainTabBar } from '../components/MainTabBar';
import type { FeedListing, MainTab } from '../navigation/types';
import { isFirebaseConfigured } from '../lib/firebase/isConfigured';
import { appStyles } from '../styles/appStyles';
import { ListingDetails } from './ListingDetailsScreen';

export function HomeScreen({
  user,
  authLoading,
  selectedListing,
  feedListings,
  visibleListings,
  feedLoading,
  feedError,
  appliedFeedFilters,
  appliedFeedSort,
  feedFilterSummary,
  mainTab,
  messagesBadgeCount,
  filterModalVisible,
  feedScrollRef,
  openAuthModal,
  requestSignOut,
  onSelectListing,
  onClearListing,
  onOpenThread,
  onOpenSaved,
  onOpenAccount,
  onMainTabPress,
  onFeedScroll,
  onAppliedFeedSortChange,
  onOpenFilterModal,
  onCloseFilterModal,
  onApplyFeedSearch,
  onOpenPublish,
}: {
  user: { uid: string } | null;
  authLoading: boolean;
  selectedListing: RentalListing | null;
  feedListings: FeedListing[];
  visibleListings: FeedListing[];
  feedLoading: boolean;
  feedError: boolean;
  appliedFeedFilters: FeedSearchFilters;
  appliedFeedSort: FeedSortId;
  feedFilterSummary: string;
  mainTab: MainTab;
  messagesBadgeCount: number;
  filterModalVisible: boolean;
  feedScrollRef: RefObject<ScrollView | null>;
  openAuthModal: () => void;
  requestSignOut: () => void;
  onSelectListing: (listing: RentalListing) => void;
  onClearListing: () => void;
  onOpenThread: (threadId: string) => void;
  onOpenSaved: () => void;
  onOpenAccount: () => void;
  onMainTabPress: (tab: MainTab) => void;
  onFeedScroll: (event: { nativeEvent: NativeScrollEvent }) => void;
  onAppliedFeedSortChange: (sort: FeedSortId) => void;
  onOpenFilterModal: () => void;
  onCloseFilterModal: () => void;
  onApplyFeedSearch: (filters: FeedSearchFilters) => void;
  onOpenPublish: () => void;
}) {
  const filtersActive = feedSearchFiltersIsActive(appliedFeedFilters);

  return (
    <SafeAreaView style={appStyles.safeArea}>
      <StatusBar style="dark" />
      <View style={appStyles.mainShell}>
        {selectedListing ? (
          <ListingDetails
            listing={selectedListing}
            onBack={onClearListing}
            onOpenThread={onOpenThread}
          />
        ) : (
          <>
            <LobbyHomeHeader
              showServerHint={!isFirebaseConfigured()}
              authLoading={authLoading}
              user={user}
              showSaved={isFirebaseConfigured()}
              onSignOut={requestSignOut}
              onSignIn={openAuthModal}
              onAccount={onOpenAccount}
              onSaved={onOpenSaved}
            />

            <ScrollView
              ref={feedScrollRef}
              bounces={false}
              alwaysBounceVertical={false}
              overScrollMode="never"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={appStyles.scrollContent}
              onScroll={onFeedScroll}
              scrollEventThrottle={16}
            >
              <HomeFeedHero
                searchSummary={feedFilterSummary}
                hasActiveFilters={filtersActive}
                onOpenSearch={onOpenFilterModal}
              />

              <View style={appStyles.feedToolbarBlock}>
                <View style={appStyles.feedSortRow}>
                  {FEED_SORT_OPTIONS.map((opt) => (
                    <Pressable
                      key={opt.id}
                      style={[appStyles.feedSortPill, appliedFeedSort === opt.id && appStyles.feedSortPillOn]}
                      accessibilityRole="button"
                      accessibilityLabel={`מיון: ${opt.label}`}
                      onPress={() => onAppliedFeedSortChange(opt.id)}
                    >
                      <Text
                        style={[
                          appStyles.feedSortPillText,
                          appliedFeedSort === opt.id && appStyles.feedSortPillTextOn,
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                <Text style={appStyles.sectionTitle}>דירות להשכרה</Text>
              </View>

              {feedLoading && feedListings.length === 0 ? (
                <Text style={appStyles.feedLoadingText} accessibilityRole="text">
                  טוענים מודעות…
                </Text>
              ) : null}

              {!feedLoading && feedError ? (
                <Text style={appStyles.feedLoadingText} accessibilityRole="text">
                  לא הצלחנו לטעון מודעות. בדקו חיבור ונסו שוב.
                </Text>
              ) : null}

              {!feedLoading && !feedError && !isFirebaseConfigured() ? (
                <Text style={appStyles.feedLoadingText} accessibilityRole="text">
                  אין חיבור ל־Firebase. הגדירו את משתני הסביבה כדי להציג מודעות מהלוח.
                </Text>
              ) : null}

              {!feedLoading && !feedError && isFirebaseConfigured() && feedListings.length === 0 ? (
                <Text style={appStyles.feedLoadingText} accessibilityRole="text">
                  {filtersActive
                    ? feedFilterSummary
                      ? `אין כרגע מודעות פעילות ב${feedFilterSummary} לפי הסינון. נסו אזור רחב יותר או פחות מסננים.`
                      : 'אין מודעות שעונות על הסינון. נסו לשנות מחיר, חדרים, מאפיינים או מיקום.'
                    : 'אין כרגע מודעות פעילות בלוח. כשמפרסמים יעלו מודעות — הן יופיעו כאן.'}
                </Text>
              ) : null}

              <View style={appStyles.cards}>
                {visibleListings.map((listing) => (
                  <ListingCard
                    key={listing.feedKey}
                    listing={listing}
                    onPress={() => onSelectListing(listing)}
                  />
                ))}
              </View>

              <View style={appStyles.trustStrip}>
                <Text style={appStyles.trustTitle}>ראית דרישת עמלה?</Text>
                <Text style={appStyles.trustText}>כל מודעה כוללת דיווח, כדי לשמור על לובי נקייה.</Text>
              </View>

              <AppFooter />
            </ScrollView>
          </>
        )}

        <FloatingMainTabBar
          activeTab={mainTab}
          messagesBadgeCount={messagesBadgeCount}
          onTabPress={onMainTabPress}
        />

        <Modal
          visible={filterModalVisible}
          animationType="slide"
          transparent
          onRequestClose={onCloseFilterModal}
        >
          <View style={appStyles.filterModalRoot}>
            <Pressable
              style={appStyles.filterModalBackdrop}
              accessibilityRole="button"
              accessibilityLabel="סגירת רקע"
              onPress={onCloseFilterModal}
            />
            <View style={appStyles.filterModalSheet}>
              <View style={appStyles.filterModalHandle} />
              <View style={appStyles.filterModalHeader}>
                <Text style={appStyles.filterModalTitle}>חיפוש וסינון</Text>
                <Pressable accessibilityRole="button" accessibilityLabel="סגירה" onPress={onCloseFilterModal}>
                  <Text style={appStyles.filterModalClose}>סגירה</Text>
                </Pressable>
              </View>
              <ScrollView
                bounces={false}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={appStyles.filterModalBody}
                keyboardShouldPersistTaps="handled"
              >
                <FeedSearchPanel
                  appliedFilters={appliedFeedFilters}
                  appliedSort={appliedFeedSort}
                  onSearch={onApplyFeedSearch}
                  onSortChange={onAppliedFeedSortChange}
                  loading={feedLoading}
                />
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}
