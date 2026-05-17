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
  ImageBackground,
  Modal,
  NativeScrollEvent,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { FeedSearchPanel } from '../FeedSearchPanel';
import { lobbyBanners } from '../constants/homeFeed';
import { AppFooter } from '../components/AppFooter';
import { FilterIcon } from '../components/FilterIcon';
import { ListingCard } from '../components/ListingCard';
import { FloatingMainTabBar } from '../components/MainTabBar';
import { SavedListingsHeaderButton } from '../components/SavedListingsHeaderButton';
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
  activeBannerIndex,
  mainTab,
  messagesBadgeCount,
  filterModalVisible,
  bannerWidth,
  bannerScrollRef,
  feedScrollRef,
  openAuthModal,
  requestSignOut,
  onSelectListing,
  onClearListing,
  onOpenThread,
  onOpenSaved,
  onOpenAccount,
  onMainTabPress,
  onBannerScroll,
  onFeedScroll,
  onAppliedFeedSortChange,
  onOpenFilterModal,
  onCloseFilterModal,
  onApplyFeedSearch,
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
  activeBannerIndex: number;
  mainTab: MainTab;
  messagesBadgeCount: number;
  filterModalVisible: boolean;
  bannerWidth: number;
  bannerScrollRef: RefObject<ScrollView | null>;
  feedScrollRef: RefObject<ScrollView | null>;
  openAuthModal: () => void;
  requestSignOut: () => void;
  onSelectListing: (listing: RentalListing) => void;
  onClearListing: () => void;
  onOpenThread: (threadId: string) => void;
  onOpenSaved: () => void;
  onOpenAccount: () => void;
  onMainTabPress: (tab: MainTab) => void;
  onBannerScroll: (event: { nativeEvent: NativeScrollEvent }) => void;
  onFeedScroll: (event: { nativeEvent: NativeScrollEvent }) => void;
  onAppliedFeedSortChange: (sort: FeedSortId) => void;
  onOpenFilterModal: () => void;
  onCloseFilterModal: () => void;
  onApplyFeedSearch: (filters: FeedSearchFilters) => void;
}) {
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
            <View style={appStyles.headerMainSimple}>
              <View style={appStyles.headerSideSlot}>
                {!isFirebaseConfigured() ? (
                  <Text style={appStyles.headerMuted}>ללא שרת</Text>
                ) : authLoading ? (
                  <Text style={appStyles.headerMuted}>…</Text>
                ) : user ? (
                  <Pressable accessibilityRole="button" accessibilityLabel="יציאה" onPress={requestSignOut}>
                    <Text style={appStyles.headerTextButton}>יציאה</Text>
                  </Pressable>
                ) : null}
              </View>
              <Text style={appStyles.brandLogoText}>LOBBY</Text>
              <View style={[appStyles.headerSideSlot, appStyles.headerSideSlotEnd]}>
                {isFirebaseConfigured() ? (
                  <SavedListingsHeaderButton onPress={onOpenSaved} />
                ) : null}
                {!authLoading && user && isFirebaseConfigured() ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="אזור אישי"
                    onPress={onOpenAccount}
                  >
                    <Text style={appStyles.headerTextButton}>אזור אישי</Text>
                  </Pressable>
                ) : !authLoading && !user && isFirebaseConfigured() ? (
                  <Pressable accessibilityRole="button" accessibilityLabel="כניסה" onPress={openAuthModal}>
                    <Text style={appStyles.headerTextButton}>כניסה</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>

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
              <ScrollView
                ref={bannerScrollRef}
                horizontal
                bounces={false}
                alwaysBounceHorizontal={false}
                overScrollMode="never"
                pagingEnabled
                decelerationRate="fast"
                snapToInterval={bannerWidth}
                snapToAlignment="start"
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={appStyles.bannerCarousel}
                onScroll={onBannerScroll}
                scrollEventThrottle={16}
              >
                {lobbyBanners.map((banner) => (
                  <ImageBackground
                    key={banner.id}
                    source={{ uri: banner.imageUrl }}
                    imageStyle={appStyles.bannerBackgroundImage}
                    style={[appStyles.bannerCard, { width: bannerWidth }]}
                  />
                ))}
              </ScrollView>

              <View style={appStyles.bannerIndicators}>
                {lobbyBanners.map((banner, index) => (
                  <View
                    key={banner.id}
                    style={[
                      appStyles.bannerIndicator,
                      index === activeBannerIndex && appStyles.bannerIndicatorActive,
                    ]}
                  />
                ))}
              </View>

              <View style={appStyles.filterPanel}>
                <Pressable
                  style={appStyles.filterSearchRow}
                  accessibilityRole="button"
                  accessibilityLabel="חיפוש לפי מיקום"
                  onPress={onOpenFilterModal}
                >
                  <View style={appStyles.filterSearchTextWrap}>
                    <Text style={appStyles.filterSearchLabel}>איפה מחפשים?</Text>
                    <Text style={appStyles.filterSearchValue} numberOfLines={2}>
                      {feedSearchFiltersIsActive(appliedFeedFilters)
                        ? feedFilterSummary || 'סינון פעיל'
                        : 'עיר או רחוב'}
                    </Text>
                    {feedSearchFiltersIsActive(appliedFeedFilters) ? (
                      <Text style={appStyles.filterSearchHint}>לחצו לעריכה · חיפוש מחדש</Text>
                    ) : null}
                  </View>
                  <Text style={appStyles.filterSearchIcon}>⌕</Text>
                </Pressable>

                <Pressable
                  style={appStyles.filterMoreButton}
                  accessibilityRole="button"
                  accessibilityLabel="חיפוש וסינון"
                  onPress={onOpenFilterModal}
                >
                  <Text style={appStyles.filterMoreText}>
                    {feedSearchFiltersIsActive(appliedFeedFilters) ? 'עריכת סינון' : 'סינון'}
                  </Text>
                  <FilterIcon />
                </Pressable>
              </View>

              <View style={appStyles.sectionHeader}>
                <Text style={appStyles.sectionTitle}>דירות להשכרה</Text>
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
                  {feedSearchFiltersIsActive(appliedFeedFilters)
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
