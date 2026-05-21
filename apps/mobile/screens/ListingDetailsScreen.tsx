import {
  featureLabels,
  formatListingContactPhoneDisplay,
  formatListingLocationLine,
  normalizeListingContactPhone,
  LISTING_DESCRIPTION_MAX_CHARACTERS,
  REPORT_OTHER_DETAILS_MAX_CHARACTERS,
  type ReportReason,
  type RentalListing,
} from '@lobby/shared';
import { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { reportReasonOptions } from '../constants/homeFeed';
import { createOrGetChatThread } from '../lib/firebase/chat';
import { fetchListingByIdFromFirestore } from '../lib/firebase/listingQueries';
import { getFirestoreDb, ensureFirestoreAuthReady } from '../lib/firebase/client';
import { isFirebaseConfigured } from '../lib/firebase/isConfigured';
import { submitListingReport } from '../lib/firebase/submitListingReport';
import { useLobbyAuth } from '../lib/LobbyAuthContext';
import { ListingBannersSection } from '../components/ListingBannersSection';
import { ListingSidebarBannersSection } from '../components/ListingSidebarBannersSection';
import { ListingGalleryBlock } from '../components/ListingGalleryBlock';
import { ListingVideoBlock } from '../components/ListingVideoBlock';
import { AppFooter } from '../components/AppFooter';
import { appStyles } from '../styles/appStyles';

const DESCRIPTION_TOGGLE_THRESHOLD = 110;

export function ListingDetails({
  listing,
  onBack,
  onOpenThread,
}: {
  listing: RentalListing;
  onBack: () => void;
  onOpenThread: (threadId: string) => void;
}) {
  const { user, openAuthModal } = useLobbyAuth();
  const [resolvedListing, setResolvedListing] = useState(listing);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [selectedReportReason, setSelectedReportReason] = useState<ReportReason | null>(null);
  const [otherReportDetails, setOtherReportDetails] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportFeedback, setReportFeedback] = useState<'ok' | 'err' | null>(null);
  const [chatBusy, setChatBusy] = useState(false);
  const [chatHint, setChatHint] = useState<string | null>(null);
  const reportScrollRef = useRef<ScrollView | null>(null);
  const description = resolvedListing.description.trim().slice(0, LISTING_DESCRIPTION_MAX_CHARACTERS);
  const shouldShowDescriptionToggle = description.length > DESCRIPTION_TOGGLE_THRESHOLD;
  const isOtherReportReason = selectedReportReason === 'other';
  const canSubmitReport =
    Boolean(selectedReportReason) && (!isOtherReportReason || otherReportDetails.trim().length > 0);

  const closeReportSheet = () => {
    setIsReportOpen(false);
    setSelectedReportReason(null);
    setOtherReportDetails('');
    setReportFeedback(null);
  };

  async function handleSubmitReport() {
    if (!selectedReportReason || !canSubmitReport) {
      return;
    }

    if (!isFirebaseConfigured()) {
      setReportFeedback('err');
      return;
    }

    if (!user) {
      openAuthModal();
      return;
    }

    setReportSubmitting(true);
    setReportFeedback(null);

    try {
      await submitListingReport({
        listingId: resolvedListing.id,
        listingTitle: resolvedListing.title,
        reporterId: user.uid,
        reason: selectedReportReason,
        otherDetails: isOtherReportReason ? otherReportDetails.trim() : undefined,
      });
      setReportFeedback('ok');
      setTimeout(() => closeReportSheet(), 1400);
    } catch {
      setReportFeedback('err');
    } finally {
      setReportSubmitting(false);
    }
  }

  async function handleStartChat() {
    setChatHint(null);

    if (!isFirebaseConfigured()) {
      setChatHint('אין חיבור לשרת.');
      return;
    }

    if (!user) {
      openAuthModal();
      return;
    }

    const publisherUid = resolvedListing.publisher.id;

    if (!publisherUid || publisherUid === 'unknown') {
      setChatHint('לא נמצאו פרטי מפרסם במודעה — לא ניתן לפתוח שיחה.');
      return;
    }

    if (user.uid === publisherUid) {
      setChatHint('זו המודעה שלך.');
      return;
    }

    setChatBusy(true);

    try {
      try {
        await ensureFirestoreAuthReady(user);
      } catch {
        /* ignore */
      }

      const threadId = await createOrGetChatThread(getFirestoreDb(), {
        listingId: resolvedListing.id,
        listingTitle: resolvedListing.title,
        publisherUserId: publisherUid,
        renterUserId: user.uid,
      });
      onOpenThread(threadId);
    } catch {
      setChatHint('לא ניתן לפתוח שיחה.');
    } finally {
      setChatBusy(false);
    }
  }

  useEffect(() => {
    if (!isReportOpen || !isOtherReportReason) {
      return;
    }

    const firstScroll = setTimeout(() => {
      reportScrollRef.current?.scrollToEnd({ animated: true });
    }, 80);
    const secondScroll = setTimeout(() => {
      reportScrollRef.current?.scrollToEnd({ animated: true });
    }, 320);

    return () => {
      clearTimeout(firstScroll);
      clearTimeout(secondScroll);
    };
  }, [isReportOpen, isOtherReportReason]);

  useEffect(() => {
    setResolvedListing(listing);

    if (!isFirebaseConfigured()) {
      return;
    }

    let cancelled = false;

    void fetchListingByIdFromFirestore(listing.id).then((fresh) => {
      if (!cancelled && fresh) {
        setResolvedListing(fresh);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [listing]);

  return (
    <View style={appStyles.listingDetailsRoot}>
      <View style={appStyles.header}>
        <Pressable
          style={appStyles.headerAuthAction}
          accessibilityRole="button"
          accessibilityLabel="חזרה"
          onPress={onBack}
        >
          <BackArrowIcon />
        </Pressable>

        <View style={appStyles.logoRow}>
          <Text style={appStyles.brandLogoText}>LOBBY</Text>
        </View>

        <Pressable
          style={appStyles.headerPublishAction}
          accessibilityRole="button"
          accessibilityLabel="דיווח על מודעה"
          onPress={() => setIsReportOpen(true)}
        >
          <Text style={appStyles.headerTextButton}>דיווח</Text>
        </Pressable>
      </View>

      <ScrollView
        style={appStyles.listingDetailsScroll}
        bounces={false}
        alwaysBounceVertical={false}
        overScrollMode="never"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={appStyles.detailContent}
      >
        <ListingGalleryBlock
          imageUrl={resolvedListing.imageUrl}
          gallery={resolvedListing.gallery}
          title={resolvedListing.title}
          listingId={resolvedListing.id}
          priceIls={resolvedListing.priceIls}
        />
        {resolvedListing.video?.url ? (
          <ListingVideoBlock video={resolvedListing.video} title={resolvedListing.title} />
        ) : null}

        <ListingBannersSection />

        <View style={appStyles.detailCard}>
          {resolvedListing.propertyTypeLabel?.trim() ? (
            <View style={appStyles.detailTypePill}>
              <Text style={appStyles.detailTypePillText}>{resolvedListing.propertyTypeLabel.trim()}</Text>
            </View>
          ) : null}
          <Text style={appStyles.detailPriceHero}>
            ₪{resolvedListing.priceIls.toLocaleString('he-IL')}
          </Text>
          <Text style={[appStyles.detailTitle, { marginTop: 12 }]}>{resolvedListing.title}</Text>
          <Text style={appStyles.detailLocation}>{formatListingLocationLine(resolvedListing)}</Text>

          <View style={appStyles.statsGrid}>
            <Stat label="חדרים" value={`${resolvedListing.rooms}`} />
            <Stat label="מ״ר" value={`${resolvedListing.sizeSqm}`} />
            <Stat label="קומה" value={`${resolvedListing.floor}/${resolvedListing.totalFloors}`} />
            {resolvedListing.sizeSqm > 0 ? (
              <Stat
                label="למ״ר"
                value={`₪${Math.round(resolvedListing.priceIls / resolvedListing.sizeSqm).toLocaleString('he-IL')}`}
              />
            ) : null}
          </View>

          <Text style={appStyles.detailSectionTitle}>תיאור המפרסם</Text>
          <View style={appStyles.detailDescriptionCard}>
            <Text
              style={appStyles.detailDescription}
              numberOfLines={!isDescriptionExpanded && shouldShowDescriptionToggle ? 3 : undefined}
            >
              {description}
            </Text>
          </View>
          {shouldShowDescriptionToggle ? (
            <Pressable
              style={appStyles.descriptionToggle}
              accessibilityRole="button"
              accessibilityLabel={isDescriptionExpanded ? 'הצג פחות על הדירה' : 'הצג עוד על הדירה'}
              onPress={() => setIsDescriptionExpanded((current) => !current)}
            >
              <Text style={appStyles.descriptionToggleText}>
                {isDescriptionExpanded ? 'הצג פחות' : 'הצג עוד'}
              </Text>
            </Pressable>
          ) : null}

          <Text style={appStyles.detailSectionTitle}>מאפיינים</Text>
          <View style={appStyles.featureRow}>
            {resolvedListing.features.map((feature) => (
              <Text key={feature} style={appStyles.featurePill}>
                {featureLabels[feature]}
              </Text>
            ))}
          </View>
        </View>

        <View style={appStyles.publisherCard}>
          <View style={appStyles.publisherRow}>
            <View style={appStyles.publisherAvatar}>
              <Text style={appStyles.publisherAvatarText}>
                {(resolvedListing.publisher.displayName.trim().charAt(0) || 'ל').toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={appStyles.publisherName}>{resolvedListing.publisher.displayName}</Text>
              <Text style={appStyles.publisherSubtitle}>מפרסם/ת בלובי</Text>
            </View>
          </View>
          {resolvedListing.publisher.contactPhone ? (
            <Pressable
              style={appStyles.phoneButton}
              accessibilityRole="button"
              accessibilityLabel="התקשרות למפרסם"
              onPress={() => {
                const tel = normalizeListingContactPhone(resolvedListing.publisher.contactPhone ?? '');
                if (tel) {
                  void Linking.openURL(`tel:${tel}`);
                }
              }}
            >
              <Text style={appStyles.phoneButtonText}>
                {formatListingContactPhoneDisplay(resolvedListing.publisher.contactPhone ?? '')}
              </Text>
            </Pressable>
          ) : null}
          <Pressable
            style={[appStyles.chatButton, chatBusy && appStyles.chatButtonDisabled]}
            disabled={chatBusy}
            onPress={() => void handleStartChat()}
          >
            <Text style={appStyles.chatButtonText}>{chatBusy ? 'פותחים…' : 'שליחת הודעה למפרסם'}</Text>
          </Pressable>
          {chatHint ? <Text style={appStyles.chatHintText}>{chatHint}</Text> : null}
          <Text style={[appStyles.publisherSubtitle, { marginTop: 12 }]}>
            ראיתם דרישת עמלה? דווחו מהמודעה — הצוות יטפל.
          </Text>
        </View>

        <ListingSidebarBannersSection />

        <AppFooter />
      </ScrollView>

      <Modal
        transparent
        visible={isReportOpen}
        animationType="fade"
        onRequestClose={closeReportSheet}
      >
        <KeyboardAvoidingView
          style={appStyles.reportKeyboardAvoidingView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 18 : 0}
        >
          <Pressable style={appStyles.reportModalOverlay} onPress={closeReportSheet}>
            <Pressable style={appStyles.reportSheet}>
              <View style={appStyles.reportSheetHeader}>
                <Pressable
                  style={appStyles.reportCloseButton}
                  accessibilityRole="button"
                  accessibilityLabel="סגירת דיווח"
                  onPress={closeReportSheet}
                >
                  <Text style={appStyles.reportCloseText}>×</Text>
                </Pressable>
                <View>
                  <Text style={appStyles.reportTitle}>דיווח על מודעה</Text>
                  <Text style={appStyles.reportSubtitle}>מה לא תקין במודעה הזאת?</Text>
                </View>
              </View>

              <ScrollView
                ref={reportScrollRef}
                bounces={false}
                alwaysBounceVertical={false}
                overScrollMode="never"
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={appStyles.reportSheetContent}
                onContentSizeChange={() => {
                  if (isOtherReportReason) {
                    reportScrollRef.current?.scrollToEnd({ animated: true });
                  }
                }}
              >
                <View style={appStyles.reportReasonList}>
                  {reportReasonOptions.map(([reason, label]) => (
                    <Pressable
                      key={reason}
                      style={[
                        appStyles.reportReasonButton,
                        selectedReportReason === reason && appStyles.selectedReportReasonButton,
                      ]}
                      accessibilityRole="button"
                      onPress={() => {
                        setSelectedReportReason(reason);

                        if (reason !== 'other') {
                          setOtherReportDetails('');
                        }
                      }}
                    >
                      <Text
                        style={[
                          appStyles.reportReasonText,
                          selectedReportReason === reason && appStyles.selectedReportReasonText,
                        ]}
                      >
                        {label}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                {isOtherReportReason ? (
                  <View style={appStyles.reportOtherField}>
                    <Text style={appStyles.reportOtherLabel}>מה קרה בדיוק?</Text>
                    <TextInput
                      style={appStyles.reportOtherInput}
                      value={otherReportDetails}
                      maxLength={REPORT_OTHER_DETAILS_MAX_CHARACTERS}
                      multiline
                      textAlign="right"
                      textAlignVertical="top"
                      placeholder="כתבו בקצרה עד 100 תווים"
                      placeholderTextColor="#8b949b"
                      onChangeText={setOtherReportDetails}
                    />
                    <Text style={appStyles.reportOtherCounter}>
                      {otherReportDetails.length}/{REPORT_OTHER_DETAILS_MAX_CHARACTERS}
                    </Text>
                  </View>
                ) : null}

                {reportFeedback === 'ok' ? (
                  <Text style={appStyles.reportSuccessBanner}>הדיווח נשלח. תודה.</Text>
                ) : null}
                {reportFeedback === 'err' ? (
                  <Text style={appStyles.reportErrorBanner}>שגיאה בשליחה. נסו שוב.</Text>
                ) : null}

                <Pressable
                  style={[
                    appStyles.reportSubmitButton,
                    (!canSubmitReport || reportSubmitting || reportFeedback === 'ok') &&
                      appStyles.disabledReportSubmitButton,
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{
                    disabled: !canSubmitReport || reportSubmitting || reportFeedback === 'ok',
                  }}
                  disabled={!canSubmitReport || reportSubmitting || reportFeedback === 'ok'}
                  onPress={() => void handleSubmitReport()}
                >
                  <Text style={appStyles.reportSubmitText}>{reportSubmitting ? 'שולחים…' : 'שליחת דיווח'}</Text>
                </Pressable>
              </ScrollView>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function BackArrowIcon() {
  return (
    <View style={appStyles.backArrowIcon}>
      <View style={appStyles.backArrowShaft} />
      <View style={appStyles.backArrowHead} />
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={appStyles.statBox}>
      <Text style={appStyles.statValue}>{value}</Text>
      <View style={appStyles.statLabelRow}>
        <Text style={appStyles.statLabel}>{label}</Text>
      </View>
    </View>
  );
}
