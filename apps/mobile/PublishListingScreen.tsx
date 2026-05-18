import * as ImagePicker from "expo-image-picker";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PublishLocationFields } from "./PublishLocationFields";
import { PublishVideoPreview } from "./components/PublishVideoPreview";
import {
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  publishLocationIsValid,
  rentalListingToResolvedLocation,
  LISTING_DESCRIPTION_MAX_CHARACTERS,
  LISTING_MEDIA_LIMITS,
  LISTING_PROPERTY_CONDITION_OPTIONS,
  LISTING_PROPERTY_TYPE_OPTIONS,
  LISTING_TITLE_MAX_CHARACTERS,
  featureLabels,
  listingPropertyConditionLabel,
  listingPropertyTypeLabel,
  rentalListingToPublishFormSeed,
  type ListingVideo,
  type PropertyFeature,
  type ResolvedLocation,
} from "@lobby/shared";
import { ensureFirestoreAuthReady } from "./lib/firebase/client";
import { fetchListingByIdFromFirestore } from "./lib/firebase/listingQueries";
import { submitListingForReview } from "./lib/firebase/listingModeration";
import { isFirebaseConfigured } from "./lib/firebase/isConfigured";
import {
  listingPublishStatusForNewSave,
  newListingDocumentId,
  saveListingDraft,
  updateListing,
  uploadListingImageFromUri,
  uploadListingVideoFromUri,
} from "./lib/firebase/publishListing";
import { useLobbyAuth } from "./lib/LobbyAuthContext";

const ALL_FEATURES: PropertyFeature[] = [
  "parking",
  "elevator",
  "mamad",
  "balcony",
  "furnished",
  "pets",
  "renovated",
  "airConditioning",
];

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function toLocalIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function buildEntryDateOptions(dayCount: number): { iso: string; label: string }[] {
  const options: { iso: string; label: string }[] = [];
  const base = new Date();
  base.setHours(12, 0, 0, 0);
  for (let i = 0; i < dayCount; i += 1) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    options.push({
      iso: toLocalIsoDate(d),
      label: d.toLocaleDateString("he-IL", {
        weekday: "short",
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    });
  }
  return options;
}

function randomId(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function videoDurationSecondsFromAsset(duration: number | null | undefined): number | null {
  if (duration == null || !Number.isFinite(duration) || duration <= 0) {
    return null;
  }
  return duration > 1000 ? duration / 1000 : duration;
}

type ImageSlot = { id: string; uri: string; mimeType?: string | null; isRemote?: boolean };

export function PublishListingScreen({
  onClose,
  editListingId,
}: {
  onClose: () => void;
  editListingId?: string;
}) {
  const { user, loading, openAuthModal, displayNameForUi } = useLobbyAuth();
  const isEditMode = Boolean(editListingId);
  const publishAsActive = listingPublishStatusForNewSave() === "active";
  const [editLoading, setEditLoading] = useState(Boolean(editListingId));
  const [editLoadError, setEditLoadError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [resolvedLocation, setResolvedLocation] = useState<ResolvedLocation | null>(null);
  const [houseNumber, setHouseNumber] = useState("");
  const [propertyTypeId, setPropertyTypeId] = useState("");
  const [propertyConditionId, setPropertyConditionId] = useState("");
  const [priceIls, setPriceIls] = useState("");
  const [rooms, setRooms] = useState("");
  const [sizeSqm, setSizeSqm] = useState("");
  const [floor, setFloor] = useState("");
  const [totalFloors, setTotalFloors] = useState("");
  const [entryImmediate, setEntryImmediate] = useState(true);
  const [entryDateIso, setEntryDateIso] = useState(todayIsoDate);
  const [entryDateModalOpen, setEntryDateModalOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [typePickerOpen, setTypePickerOpen] = useState(false);
  const [conditionPickerOpen, setConditionPickerOpen] = useState(false);
  const [features, setFeatures] = useState<PropertyFeature[]>([]);
  const [images, setImages] = useState<ImageSlot[]>([]);
  const [existingVideo, setExistingVideo] = useState<ListingVideo | null>(null);
  const [videoRemoved, setVideoRemoved] = useState(false);
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [videoMime, setVideoMime] = useState<string | null>(null);
  const [videoDurationSec, setVideoDurationSec] = useState<number | null>(null);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptNoBroker, setAcceptNoBroker] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [sentForModerationReview, setSentForModerationReview] = useState(false);
  const [requiresModerationResubmit, setRequiresModerationResubmit] = useState(false);

  const toggleFeature = useCallback((key: PropertyFeature) => {
    setFeatures((prev) => (prev.includes(key) ? prev.filter((f) => f !== key) : [...prev, key]));
  }, []);

  const parsedEntryDate = useMemo(() => {
    const parts = entryDateIso.split("-").map((x) => Number(x));
    if (parts.length === 3 && parts.every((n) => Number.isFinite(n))) {
      const [y, m, d] = parts;
      return new Date(y, m - 1, d);
    }
    return new Date();
  }, [entryDateIso]);

  const propertyTypeButtonLabel = propertyTypeId ? listingPropertyTypeLabel(propertyTypeId) : "בחרו";
  const propertyConditionButtonLabel = propertyConditionId
    ? listingPropertyConditionLabel(propertyConditionId)
    : "בחרו";
  const entryDateHebrew = useMemo(() => {
    try {
      return parsedEntryDate.toLocaleDateString("he-IL", { day: "numeric", month: "long", year: "numeric" });
    } catch {
      return entryDateIso;
    }
  }, [parsedEntryDate, entryDateIso]);

  const entryDatePickOptions = useMemo(() => buildEntryDateOptions(180), []);

  const requestLibraryPermission = useCallback(async (): Promise<boolean> => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("הרשאה נדרשת", "כדי להעלות תמונות או סרטון יש לאשר גישה לספריית המדיה.");
      return false;
    }
    return true;
  }, []);

  const pickImages = useCallback(async () => {
    if (!(await requestLibraryPermission())) {
      return;
    }
    const remaining = LISTING_MEDIA_LIMITS.maxImages - images.length;
    if (remaining <= 0) {
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.85,
    });
    if (result.canceled || !result.assets?.length) {
      return;
    }
    const next: ImageSlot[] = result.assets
      .filter((a) => a.type === "image" || !a.type)
      .map((a) => ({
        id: randomId(),
        uri: a.uri,
        mimeType: a.mimeType ?? "image/jpeg",
      }));
    setImages((prev) => [...prev, ...next].slice(0, LISTING_MEDIA_LIMITS.maxImages));
  }, [images.length, requestLibraryPermission]);

  const removeImage = useCallback((id: string) => {
    setImages((prev) => prev.filter((i) => i.id !== id));
  }, []);

  useEffect(() => {
    if (!editListingId || !user || !isFirebaseConfigured()) {
      setEditLoading(false);
      return;
    }

    let cancelled = false;

    const loadForEdit = async () => {
      setEditLoading(true);
      setEditLoadError(null);
      try {
        const listing = await fetchListingByIdFromFirestore(editListingId);
        if (cancelled) {
          return;
        }
        if (!listing || listing.publisher.id !== user.uid) {
          setEditLoadError("לא ניתן לטעון את המודעה לעריכה.");
          return;
        }
        if (listing.status === "rented" || listing.status === "removed") {
          setEditLoadError("מודעה זו לא ניתנת לעריכה.");
          return;
        }
        if (listing.status === "pending_review") {
          setEditLoadError("המודעה כבר נשלחה לבדיקת הצוות.");
          return;
        }
        setRequiresModerationResubmit(listing.moderationAction === "returned_to_draft");
        const seed = rentalListingToPublishFormSeed(listing);
        setTitle(seed.title);
        setResolvedLocation(rentalListingToResolvedLocation(listing));
        setHouseNumber(seed.houseNumber);
        setPropertyTypeId(seed.propertyTypeId);
        setPropertyConditionId(seed.propertyConditionId);
        setPriceIls(seed.priceIls);
        setRooms(seed.rooms);
        setSizeSqm(seed.sizeSqm);
        setFloor(seed.floor);
        setTotalFloors(seed.totalFloors);
        setEntryImmediate(seed.entryImmediate);
        setEntryDateIso(seed.entryDateIso);
        setDescription(seed.description);
        setFeatures(seed.features);
        setImages(
          seed.galleryUrls.map((url, index) => ({
            id: `remote-${index}`,
            uri: url,
            isRemote: true,
          })),
        );
        setExistingVideo(seed.video ?? null);
        setVideoRemoved(false);
        setVideoUri(null);
        setVideoMime(null);
        setVideoDurationSec(null);
        setAcceptTerms(true);
        setAcceptNoBroker(true);
      } catch {
        if (!cancelled) {
          setEditLoadError("לא ניתן לטעון את המודעה. נסו שוב.");
        }
      } finally {
        if (!cancelled) {
          setEditLoading(false);
        }
      }
    };

    void loadForEdit();

    return () => {
      cancelled = true;
    };
  }, [editListingId, user]);

  const pickVideo = useCallback(async () => {
    if (!(await requestLibraryPermission())) {
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["videos"],
      quality: 1,
    });
    if (result.canceled || !result.assets?.[0]) {
      return;
    }
    const asset = result.assets[0];
    const sec = videoDurationSecondsFromAsset(asset.duration ?? null);
    if (sec == null) {
      setError("לא התקבל אורך סרטון מהמכשיר. נסו קובץ אחר.");
      setVideoUri(null);
      setVideoMime(null);
      setVideoDurationSec(null);
      return;
    }
    if (sec > LISTING_MEDIA_LIMITS.maxVideoDurationSeconds + 0.5) {
      setError(`אורך הסרטון חייב להיות עד ${LISTING_MEDIA_LIMITS.maxVideoDurationSeconds} שניות.`);
      setVideoUri(null);
      setVideoMime(null);
      setVideoDurationSec(null);
      return;
    }
    setError(null);
    setVideoUri(asset.uri);
    setVideoMime(asset.mimeType ?? "video/mp4");
    setVideoDurationSec(Math.round(sec));
    setVideoRemoved(false);
    setExistingVideo(null);
  }, [requestLibraryPermission]);

  const clearVideo = useCallback(() => {
    if (videoUri) {
      setVideoUri(null);
      setVideoMime(null);
      setVideoDurationSec(null);
      return;
    }
    setVideoRemoved(true);
    setExistingVideo(null);
  }, [videoUri]);

  const hasVideoAttached = Boolean(
    (videoUri && videoDurationSec != null) || (existingVideo && !videoRemoved),
  );

  const videoPreviewUri = useMemo(() => {
    if (videoRemoved) {
      return null;
    }
    if (videoUri) {
      return videoUri;
    }
    if (existingVideo?.url) {
      return existingVideo.url;
    }
    return null;
  }, [videoUri, existingVideo, videoRemoved]);

  const validate = useCallback((): string | null => {
    if (!title.trim()) {
      return "נא למלא כותרת למודעה.";
    }
    if (title.trim().length > LISTING_TITLE_MAX_CHARACTERS) {
      return `הכותרת ארוכה מדי (עד ${LISTING_TITLE_MAX_CHARACTERS} תווים).`;
    }
    if (!propertyTypeId) {
      return "נא לבחור סוג נכס.";
    }
    const locationError = publishLocationIsValid(resolvedLocation, houseNumber);
    if (locationError) {
      return locationError;
    }
    if (!propertyConditionId) {
      return "נא לבחור מצב נכס.";
    }
    const price = Number(priceIls);
    if (!Number.isFinite(price) || price < 1) {
      return "נא להזין מחיר חודשי תקין בשקלים.";
    }
    const roomsNum = Number(rooms);
    if (!Number.isFinite(roomsNum) || roomsNum < 0.5 || roomsNum > 20) {
      return "נא להזין מספר חדרים בין 0.5 ל־20.";
    }
    const sqm = Number(sizeSqm);
    if (!Number.isFinite(sqm) || sqm < 5 || sqm > 2000) {
      return "נא להזין שטח במ״ר הגיוני.";
    }
    const fl = Number(floor);
    const tf = Number(totalFloors);
    if (!Number.isFinite(fl) || fl < 0 || fl > 80) {
      return "נא להזין קומה תקינה.";
    }
    if (!Number.isFinite(tf) || tf < 1 || tf > 120) {
      return "נא להזין מספר קומות בבניין תקין.";
    }
    if (tf < fl) {
      return "מספר הקומות בבניין חייב להיות לפחות כמו הקומה של הדירה.";
    }
    if (!entryImmediate) {
      if (!entryDateIso.trim()) {
        return "נא לבחור תאריך כניסה.";
      }
    }
    if (!description.trim()) {
      return "נא למלא תיאור (״על הדירה״).";
    }
    if (description.trim().length > LISTING_DESCRIPTION_MAX_CHARACTERS) {
      return `התיאור ארוך מדי (עד ${LISTING_DESCRIPTION_MAX_CHARACTERS} תווים).`;
    }
    if (images.length < 1) {
      return "נא לבחור לפחות תמונה אחת.";
    }
    if (!isEditMode) {
      if (!acceptTerms) {
        return "יש לאשר את תנאי השימוש והפרסום.";
      }
      if (!acceptNoBroker) {
        return "יש לאשר שהמודעה עומדת במדיניות ללא דמי תיווך לשוכרים.";
      }
    }
    return null;
  }, [
    title,
    resolvedLocation,
    houseNumber,
    propertyTypeId,
    propertyConditionId,
    priceIls,
    rooms,
    sizeSqm,
    floor,
    totalFloors,
    entryImmediate,
    entryDateIso,
    description,
    images.length,
    acceptTerms,
    acceptNoBroker,
    isEditMode,
  ]);

  const handleSubmit = useCallback(async () => {
    setError(null);
    const v = validate();
    if (v) {
      setError(v);
      return;
    }
    if (!user || !isFirebaseConfigured()) {
      setError("אין חיבור או משתמש — לא ניתן לשמור.");
      return;
    }

    setBusy(true);
    setProgress("מכינים את המודעה…");
    setSavedId(null);

    const listingId = isEditMode && editListingId ? editListingId : newListingDocumentId();

    try {
      await ensureFirestoreAuthReady(user);
    } catch {
      setError("ההתחברות לא מוכנה. נסו שוב בעוד רגע.");
      setBusy(false);
      setProgress(null);
      return;
    }

    try {
      const galleryUrls: string[] = [];
      for (let i = 0; i < images.length; i += 1) {
        const slot = images[i]!;
        if (slot.isRemote) {
          galleryUrls.push(slot.uri);
          continue;
        }
        setProgress(`מעלים תמונות (${i + 1}/${images.length})…`);
        const url = await uploadListingImageFromUri(user.uid, listingId, slot, i);
        galleryUrls.push(url);
      }

      let videoPayload: { url: string; durationSeconds: number } | undefined;
      const removeVideo = isEditMode && videoRemoved && !videoUri;
      if (videoUri && videoDurationSec != null) {
        setProgress("מעלים סרטון…");
        const url = await uploadListingVideoFromUri(user.uid, listingId, {
          uri: videoUri,
          mimeType: videoMime,
        });
        videoPayload = { url, durationSeconds: videoDurationSec };
      } else if (!videoRemoved && existingVideo) {
        videoPayload = {
          url: existingVideo.url,
          durationSeconds: existingVideo.durationSeconds,
        };
      }

      setProgress(isEditMode ? "שומרים שינויים…" : publishAsActive ? "מפרסמים…" : "שומרים בטיוטה…");
      const entryDateStored = entryImmediate ? "מיידי" : entryDateIso.trim();
      const payload = {
        listingId,
        publisherId: user.uid,
        publisherDisplayName: displayNameForUi,
        title: title.trim(),
        location: resolvedLocation!,
        houseNumber: houseNumber.trim(),
        propertyTypeId,
        propertyTypeLabel: listingPropertyTypeLabel(propertyTypeId),
        propertyConditionId,
        propertyConditionLabel: listingPropertyConditionLabel(propertyConditionId),
        priceIls: Number(priceIls),
        rooms: Number(rooms),
        sizeSqm: Number(sizeSqm),
        floor: Number(floor),
        totalFloors: Number(totalFloors),
        entryDate: entryDateStored,
        description: description.trim(),
        features,
        galleryUrls,
        video: videoPayload,
        removeVideo,
      };

      if (isEditMode) {
        await updateListing(payload);
        if (requiresModerationResubmit) {
          setProgress("שולחים לבדיקת הצוות…");
          await submitListingForReview(listingId);
          setSentForModerationReview(true);
        }
      } else {
        await saveListingDraft(payload);
      }

      setSavedId(listingId);
      setProgress(null);
    } catch {
      setError("השמירה נכשלה. בדקו חיבור, הרשאות Storage, ונסו שוב.");
      setProgress(null);
    } finally {
      setBusy(false);
    }
  }, [
    validate,
    user,
    images,
    videoUri,
    videoMime,
    videoDurationSec,
    title,
    resolvedLocation,
    houseNumber,
    propertyTypeId,
    propertyConditionId,
    priceIls,
    rooms,
    sizeSqm,
    floor,
    totalFloors,
    entryImmediate,
    entryDateIso,
    description,
    features,
    displayNameForUi,
    publishAsActive,
    isEditMode,
    editListingId,
    existingVideo,
    videoRemoved,
    requiresModerationResubmit,
  ]);

  if (!isFirebaseConfigured()) {
    return (
      <SafeAreaView style={styles.root}>
        <StatusBar style="dark" />
        <View style={styles.gate}>
          <Text style={styles.gateTitle}>פרסום דירה</Text>
          <Text style={styles.gateText}>Firebase לא מוגדר באפליקציה.</Text>
          <Pressable style={styles.gateBtn} onPress={onClose}>
            <Text style={styles.gateBtnText}>סגירה</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (loading || editLoading) {
    return (
      <SafeAreaView style={styles.root}>
        <StatusBar style="dark" />
        <Text style={styles.muted}>{editLoading ? "טוענים את המודעה לעריכה…" : "טוען…"}</Text>
      </SafeAreaView>
    );
  }

  if (editLoadError) {
    return (
      <SafeAreaView style={styles.root}>
        <StatusBar style="dark" />
        <View style={styles.gate}>
          <Text style={styles.gateTitle}>{isEditMode ? "עריכת מודעה" : "פרסום דירה"}</Text>
          <Text style={styles.gateText}>{editLoadError}</Text>
          <Pressable style={styles.gateBtn} onPress={onClose}>
            <Text style={styles.gateBtnText}>סגירה</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.root}>
        <StatusBar style="dark" />
        <View style={styles.gate}>
          <Text style={styles.gateTitle}>פרסום דירה</Text>
          <Text style={styles.gateText}>התחברו כדי לפרסם מודעה.</Text>
          <Pressable style={styles.gateBtn} onPress={openAuthModal}>
            <Text style={styles.gateBtnText}>כניסה</Text>
          </Pressable>
          <Pressable style={styles.linkBtn} onPress={onClose}>
            <Text style={styles.linkBtnText}>סגירה</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
      >
        <View style={styles.header}>
          <Pressable accessibilityRole="button" onPress={onClose} style={styles.headerSide}>
            <Text style={styles.headerAction}>סגירה</Text>
          </Pressable>
          <Text style={styles.headerTitle}>{editListingId ? "עריכת מודעה" : "פרסום דירה"}</Text>
          <View style={styles.headerSide} />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <Text style={[styles.sectionLabel, styles.sectionLabelFirst]}>פרטי הנכס</Text>
          <Field
            label="כותרת קצרה"
            value={title}
            onChangeText={setTitle}
            maxLength={LISTING_TITLE_MAX_CHARACTERS}
          />

          <Text style={styles.fieldLabel}>סוג הנכס*</Text>
          <Pressable style={styles.selectBtn} onPress={() => setTypePickerOpen(true)}>
            <Text style={[styles.selectBtnText, !propertyTypeId && styles.selectBtnPlaceholder]}>
              {propertyTypeButtonLabel}
            </Text>
          </Pressable>

          <Text style={styles.fieldLabel}>מצב הנכס*</Text>
          <Pressable style={styles.selectBtn} onPress={() => setConditionPickerOpen(true)}>
            <Text style={[styles.selectBtnText, !propertyConditionId && styles.selectBtnPlaceholder]}>
              {propertyConditionButtonLabel}
            </Text>
          </Pressable>

          <Text style={styles.fieldLabel}>מיקום הדירה *</Text>
          <PublishLocationFields
            value={resolvedLocation}
            onChange={setResolvedLocation}
            disabled={busy}
          />
          <Field
            label="מספר בית*"
            value={houseNumber}
            onChangeText={setHouseNumber}
          />
          <Field
            label="מחיר לחודש (₪)"
            value={priceIls}
            onChangeText={(t) => setPriceIls(t.replace(/[^\d]/g, ""))}
            keyboardType="number-pad"
          />
          <Field
            label="חדרים"
            value={rooms}
            onChangeText={(t) => setRooms(t.replace(/[^\d.]/g, ""))}
            keyboardType="decimal-pad"
          />
          <Field label="שטח במ״ר" value={sizeSqm} onChangeText={(t) => setSizeSqm(t.replace(/[^\d]/g, ""))} keyboardType="number-pad" />
          <Field label="קומה" value={floor} onChangeText={(t) => setFloor(t.replace(/[^\d]/g, ""))} keyboardType="number-pad" />
          <Field label="קומות בבניין" value={totalFloors} onChangeText={(t) => setTotalFloors(t.replace(/[^\d]/g, ""))} keyboardType="number-pad" />

          <Text style={styles.fieldLabel}>כניסה</Text>
          <View style={styles.entryChipsRow}>
            <Pressable
              onPress={() => {
                setEntryImmediate(true);
                setEntryDateModalOpen(false);
              }}
              style={[styles.chip, entryImmediate && styles.chipOn]}
            >
              <Text style={styles.chipText}>מיידי</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setEntryImmediate(false);
              }}
              style={[styles.chip, !entryImmediate && styles.chipOn]}
            >
              <Text style={styles.chipText}>בתאריך</Text>
            </Pressable>
          </View>
          {!entryImmediate ? (
            <Pressable style={styles.selectBtn} onPress={() => setEntryDateModalOpen(true)}>
              <Text style={styles.selectBtnText}>{entryDateHebrew}</Text>
            </Pressable>
          ) : null}

          <Text style={styles.sectionLabel}>על הדירה</Text>
          <TextInput
            style={styles.textArea}
            value={description}
            onChangeText={setDescription}
            maxLength={LISTING_DESCRIPTION_MAX_CHARACTERS}
            multiline
            textAlignVertical="top"
            textAlign="right"
          />

          <Text style={styles.sectionLabel}>מאפיינים</Text>
          <View style={styles.chipsWrap}>
            {ALL_FEATURES.map((key) => {
              const on = features.includes(key);
              return (
                <Pressable key={key} onPress={() => toggleFeature(key)} style={[styles.chip, on && styles.chipOn]}>
                  <Text style={styles.chipText}>{featureLabels[key]}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.sectionLabel}>מדיה</Text>
          <View style={styles.thumbRow}>
            {images.map((slot) => (
              <View key={slot.id} style={styles.thumb}>
                <Image source={{ uri: slot.uri }} style={styles.thumbImg} />
                <Pressable style={styles.thumbX} onPress={() => removeImage(slot.id)} accessibilityLabel="הסרה">
                  <Text style={styles.thumbXText}>×</Text>
                </Pressable>
              </View>
            ))}
          </View>
          {images.length < LISTING_MEDIA_LIMITS.maxImages ? (
            <Pressable style={styles.secondaryBtn} onPress={() => void pickImages()}>
              <Text style={styles.secondaryBtnText}>+ הוספת תמונות</Text>
            </Pressable>
          ) : null}
          <Pressable style={styles.secondaryBtn} onPress={() => void pickVideo()}>
            <Text style={styles.secondaryBtnText}>{hasVideoAttached ? "החלפת סרטון" : "סרטון"}</Text>
          </Pressable>
          {hasVideoAttached && videoPreviewUri ? (
            <>
              <PublishVideoPreview sourceUri={videoPreviewUri} />
              <View style={styles.videoMetaRow}>
                <Text style={styles.videoMetaText}>
                  {videoUri
                    ? "סרטון חדש נבחר"
                    : `סרטון קיים (${existingVideo?.durationSeconds ?? videoDurationSec ?? 0} שנ׳)`}
                </Text>
                <Pressable onPress={clearVideo}>
                  <Text style={styles.linkText}>הסרת סרטון</Text>
                </Pressable>
              </View>
            </>
          ) : null}

          <Text style={styles.sectionLabel}>פרטי מפרסם</Text>
          <Text style={styles.publisherReadonly}>
            שם להצגה: <Text style={styles.publisherReadonlyStrong}>{displayNameForUi}</Text>
          </Text>

          {!isEditMode ? (
            <>
              <Text style={styles.sectionLabel}>אישורים</Text>
              <Pressable style={styles.checkRow} onPress={() => setAcceptTerms(!acceptTerms)}>
                <View style={[styles.checkBox, acceptTerms && styles.checkBoxOn]} />
                <Text style={styles.checkLabel}>קראתי ומסכימים לתנאי השימוש והפרסום של Lobby.</Text>
              </Pressable>
              <Pressable style={styles.checkRow} onPress={() => setAcceptNoBroker(!acceptNoBroker)}>
                <View style={[styles.checkBox, acceptNoBroker && styles.checkBoxOn]} />
                <Text style={styles.checkLabel}>
                  מאשרים שהמודעה אינה דורשת דמי תיווך מהשוכר והמידע נכון לידיעתנו.
                </Text>
              </Pressable>
            </>
          ) : null}

          <Pressable style={[styles.primaryBtn, busy && styles.primaryBtnDisabled]} disabled={busy} onPress={() => void handleSubmit()}>
            <Text style={styles.primaryBtnText}>
              {busy
                ? isEditMode
                  ? "שומרים…"
                  : publishAsActive
                    ? "מפרסמים…"
                    : "שומרים…"
                : isEditMode
                  ? requiresModerationResubmit
                    ? "שמירה ושליחה לבדיקה"
                    : "שמירת שינויים"
                  : publishAsActive
                    ? "פרסום לפיד"
                    : "שמירת טיוטה"}
            </Text>
          </Pressable>
          {progress ? <Text style={styles.progress}>{progress}</Text> : null}
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          {savedId ? (
            <View style={styles.successBox}>
              <Text style={styles.successText}>
                {sentForModerationReview
                  ? "המודעה נשלחה לבדיקת הצוות. זמן הפרסום נשמר."
                  : isEditMode
                    ? "השינויים נשמרו."
                    : publishAsActive
                      ? "המודעה פורסמה בפיד."
                      : "הטיוטה נשמרה. המודעה עדיין לא ציבורית."}
              </Text>
              <Text style={styles.successId}>מזהה: {savedId}</Text>
            </View>
          ) : null}
        </ScrollView>

        <Modal visible={typePickerOpen} transparent animationType="fade" onRequestClose={() => setTypePickerOpen(false)}>
          <View style={styles.modalRoot}>
            <Pressable style={styles.modalDismissArea} onPress={() => setTypePickerOpen(false)} />
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>סוג הנכס</Text>
              <FlatList
                data={LISTING_PROPERTY_TYPE_OPTIONS}
                keyExtractor={(item) => item.id}
                style={styles.modalList}
                renderItem={({ item }) => (
                  <Pressable
                    style={styles.modalRow}
                    onPress={() => {
                      setPropertyTypeId(item.id);
                      setTypePickerOpen(false);
                    }}
                  >
                    <Text style={styles.modalRowText}>{item.label}</Text>
                  </Pressable>
                )}
              />
            </View>
          </View>
        </Modal>

        <Modal
          visible={conditionPickerOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setConditionPickerOpen(false)}
        >
          <View style={styles.modalRoot}>
            <Pressable style={styles.modalDismissArea} onPress={() => setConditionPickerOpen(false)} />
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>מצב הנכס</Text>
              <FlatList
                data={LISTING_PROPERTY_CONDITION_OPTIONS}
                keyExtractor={(item) => item.id}
                style={styles.modalList}
                renderItem={({ item }) => (
                  <Pressable
                    style={styles.modalRow}
                    onPress={() => {
                      setPropertyConditionId(item.id);
                      setConditionPickerOpen(false);
                    }}
                  >
                    <Text style={styles.modalRowText}>{item.label}</Text>
                  </Pressable>
                )}
              />
            </View>
          </View>
        </Modal>

        <Modal
          visible={entryDateModalOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setEntryDateModalOpen(false)}
        >
          <View style={styles.modalRoot}>
            <Pressable style={styles.modalDismissArea} onPress={() => setEntryDateModalOpen(false)} />
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>תאריך כניסה</Text>
              <FlatList
                data={entryDatePickOptions}
                keyExtractor={(item) => item.iso}
                style={styles.modalList}
                renderItem={({ item }) => {
                  const selected = item.iso === entryDateIso;
                  return (
                    <Pressable
                      style={[styles.modalRow, selected && styles.modalRowSelected]}
                      onPress={() => {
                        setEntryDateIso(item.iso);
                        setEntryDateModalOpen(false);
                      }}
                    >
                      <Text style={[styles.modalRowText, selected && styles.modalRowTextSelected]}>{item.label}</Text>
                    </Pressable>
                  );
                }}
              />
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({
  label,
  value,
  onChangeText,
  maxLength,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  maxLength?: number;
  keyboardType?: "default" | "number-pad" | "decimal-pad";
}) {
  return (
    <View style={styles.fieldBlock}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.fieldInput}
        value={value}
        onChangeText={onChangeText}
        maxLength={maxLength}
        keyboardType={keyboardType ?? "default"}
        textAlign="right"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e4e5e7",
  },
  headerSide: {
    minWidth: 72,
    alignItems: "flex-end",
  },
  headerAction: {
    fontSize: 16,
    fontWeight: "800",
    color: "#08b8c8",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#101820",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  intro: {
    textAlign: "right",
    fontSize: 14,
    lineHeight: 20,
    color: "#5c6670",
    fontWeight: "600",
    marginBottom: 18,
  },
  sectionLabel: {
    textAlign: "right",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.06,
    color: "#74767e",
    marginTop: 14,
    marginBottom: 8,
  },
  sectionLabelFirst: {
    marginTop: 0,
  },
  selectBtn: {
    borderWidth: 1,
    borderColor: "rgba(16,24,32,0.12)",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: "#fafafa",
    marginBottom: 10,
  },
  selectBtnText: {
    textAlign: "right",
    fontSize: 16,
    fontWeight: "600",
    color: "#101820",
  },
  selectBtnPlaceholder: {
    color: "#8b949b",
  },
  entryChipsRow: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "flex-end",
    marginBottom: 12,
  },
  modalRoot: {
    flex: 1,
    backgroundColor: "rgba(16,24,32,0.45)",
  },
  modalDismissArea: {
    ...StyleSheet.absoluteFillObject,
  },
  modalCard: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: "78%",
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 12,
    paddingBottom: 28,
    paddingTop: 4,
  },
  modalTitle: {
    textAlign: "right",
    fontSize: 16,
    fontWeight: "900",
    paddingVertical: 14,
    paddingHorizontal: 4,
    color: "#101820",
  },
  modalList: {
    flexGrow: 0,
  },
  modalRow: {
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#e4e5e7",
  },
  modalRowText: {
    textAlign: "right",
    fontSize: 15,
    fontWeight: "600",
    color: "#25313b",
  },
  modalRowSelected: {
    backgroundColor: "rgba(8,184,200,0.1)",
  },
  modalRowTextSelected: {
    fontWeight: "900",
    color: "#0299a8",
  },
  publisherReadonly: {
    textAlign: "right",
    fontSize: 15,
    fontWeight: "600",
    color: "#25313b",
    marginBottom: 4,
  },
  publisherReadonlyStrong: {
    fontWeight: "900",
  },
  fieldBlock: {
    marginBottom: 10,
  },
  fieldLabel: {
    textAlign: "right",
    fontSize: 13,
    fontWeight: "800",
    color: "#25313b",
    marginBottom: 6,
  },
  fieldInput: {
    borderWidth: 1,
    borderColor: "rgba(16,24,32,0.12)",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: "600",
    backgroundColor: "#fafafa",
    color: "#101820",
  },
  textArea: {
    borderWidth: 1,
    borderColor: "rgba(16,24,32,0.12)",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 120,
    fontSize: 16,
    fontWeight: "600",
    backgroundColor: "#fafafa",
    color: "#101820",
  },
  counter: {
    textAlign: "right",
    fontSize: 12,
    color: "#8b949b",
    marginBottom: 4,
  },
  chipsWrap: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "flex-end",
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(16,24,32,0.1)",
    backgroundColor: "#fafafa",
  },
  chipOn: {
    backgroundColor: "rgba(8,184,200,0.14)",
    borderColor: "rgba(8,184,200,0.35)",
  },
  chipText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#101820",
  },
  hint: {
    textAlign: "right",
    fontSize: 13,
    color: "#687076",
    marginBottom: 10,
  },
  thumbRow: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 12,
  },
  thumb: {
    width: 80,
    height: 80,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#e4e5e7",
  },
  thumbImg: {
    width: "100%",
    height: "100%",
  },
  thumbX: {
    position: "absolute",
    top: 4,
    left: 4,
    width: 24,
    height: 24,
    borderRadius: 999,
    backgroundColor: "rgba(16,24,32,0.7)",
    alignItems: "center",
    justifyContent: "center",
  },
  thumbXText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 14,
    lineHeight: 16,
  },
  secondaryBtn: {
    alignSelf: "flex-end",
    marginBottom: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(16,24,32,0.15)",
    backgroundColor: "#fafafa",
  },
  secondaryBtnText: {
    fontWeight: "900",
    fontSize: 14,
    color: "#101820",
  },
  videoMetaRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    gap: 8,
  },
  videoMetaText: {
    flex: 1,
    textAlign: "right",
    fontSize: 13,
    fontWeight: "700",
    color: "#687076",
  },
  linkText: {
    color: "#08b8c8",
    fontWeight: "800",
    fontSize: 14,
  },
  checkRow: {
    flexDirection: "row-reverse",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 12,
  },
  checkBox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: "#687076",
    marginTop: 2,
  },
  checkBoxOn: {
    backgroundColor: "#08b8c8",
    borderColor: "#08b8c8",
  },
  checkLabel: {
    flex: 1,
    textAlign: "right",
    fontSize: 14,
    fontWeight: "600",
    color: "#25313b",
    lineHeight: 20,
  },
  primaryBtn: {
    marginTop: 16,
    backgroundColor: "#101820",
    paddingVertical: 16,
    borderRadius: 999,
    alignItems: "center",
  },
  primaryBtnDisabled: {
    opacity: 0.5,
  },
  primaryBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "900",
  },
  progress: {
    marginTop: 10,
    textAlign: "right",
    fontSize: 13,
    fontWeight: "700",
    color: "#5c6670",
  },
  errorText: {
    marginTop: 10,
    textAlign: "right",
    color: "#a21e2e",
    fontWeight: "800",
    fontSize: 14,
  },
  successBox: {
    marginTop: 14,
    padding: 14,
    borderRadius: 14,
    backgroundColor: "rgba(8,184,200,0.1)",
    borderWidth: 1,
    borderColor: "rgba(8,184,200,0.28)",
  },
  successText: {
    textAlign: "right",
    fontSize: 14,
    fontWeight: "700",
    color: "#0d3d44",
    marginBottom: 6,
  },
  successId: {
    textAlign: "right",
    fontSize: 12,
    fontWeight: "600",
    color: "#5c6670",
  },
  muted: {
    padding: 20,
    textAlign: "right",
    color: "#5c6670",
    fontWeight: "700",
  },
  gate: {
    padding: 24,
  },
  gateTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#101820",
    textAlign: "right",
    marginBottom: 10,
  },
  gateText: {
    fontSize: 15,
    color: "#5c6670",
    textAlign: "right",
    lineHeight: 22,
    marginBottom: 18,
    fontWeight: "600",
  },
  gateBtn: {
    backgroundColor: "#101820",
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: "center",
  },
  gateBtnText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 16,
  },
  linkBtn: {
    marginTop: 12,
    alignItems: "center",
  },
  linkBtnText: {
    color: "#08b8c8",
    fontWeight: "800",
    fontSize: 15,
  },
});
