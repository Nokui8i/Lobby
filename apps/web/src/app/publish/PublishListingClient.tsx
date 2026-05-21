"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  LISTING_DESCRIPTION_MAX_CHARACTERS,
  LISTING_MEDIA_LIMITS,
  LISTING_PROPERTY_CONDITION_OPTIONS,
  LISTING_PROPERTY_TYPE_OPTIONS,
  LISTING_TITLE_MAX_CHARACTERS,
  featureLabels,
  listingPropertyConditionLabel,
  listingPropertyTypeLabel,
  LISTING_PUBLISH_ROOM_OPTIONS,
  publishRoomsFromOptionId,
  listingContactPhoneValidationError,
  normalizeListingContactPhone,
  publishLocationIsValid,
  rentalListingToPublishFormSeed,
  rentalListingToResolvedLocation,
  type ListingPublishFormSeed,
  type ListingVideo,
  type PropertyFeature,
  type ResolvedLocation,
} from "@lobby/shared";
import { PublishLocationFields } from "@/components/PublishLocationFields";
import { PublishSelectField } from "@/components/publish/PublishSelectField";
import { useLobbyAuth } from "@/contexts/LobbyAuthContext";
import { ensureFirestoreAuthReady } from "@/lib/firebase/client";
import { isFirebaseConfigured } from "@/lib/firebase/isConfigured";
import { fetchListingByIdFromFirestore } from "@/lib/firebase/listingQueries";
import { submitListingForReview } from "@/lib/firebase/listingModeration";
import {
  listingPublishStatusForNewSave,
  newListingDocumentId,
  saveListingDraft,
  updateListing,
  uploadListingImage,
  uploadListingVideo,
} from "@/lib/firebase/publishListing";
import { bubble } from "@/components/bubble/styles";
import { PublishStepper } from "@/components/lovable/ui";
import { Camera, FileText, Home, MapPin, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

/** בלי שמירת היסטוריה בדפדפן */
const publishNoRemember = {
  autoComplete: "off",
  autoCorrect: "off",
  autoCapitalize: "off",
  spellCheck: false,
  "data-lpignore": "true",
  "data-1p-ignore": true,
} as const;

const pubInputCls =
  "h-11 w-full rounded-xl border border-slate-200/80 bg-soft px-4 text-[15px] font-medium text-graphite outline-none placeholder:text-graphite/40 transition focus:border-brand focus:bg-soft focus:ring-2 focus:ring-brand/15";

const PUBLISH_WIZARD_STEPS = [
  { id: 1, label: "פרטי הנכס", icon: Home },
  { id: 2, label: "מיקום", icon: MapPin },
  { id: 3, label: "תמונות", icon: Camera },
  { id: 4, label: "תיאור ומחיר", icon: FileText },
  { id: 5, label: "סיום", icon: Sparkles },
] as const;

const pub = {
  wrap: "mx-auto w-full max-w-[1000px] px-4 pb-10 sm:px-6",
  gate: "bubble-card px-6 py-7 text-right",
  hint: "text-[15px] font-semibold leading-snug text-graphite/60",
  lead: "mb-2 text-right",
  leadTitle: "text-2xl font-black leading-tight text-graphite md:text-[28px]",
  stepHeading: "mb-4 text-right text-base font-bold text-graphite",
  grid2: "grid grid-cols-1 gap-3 sm:grid-cols-2",
  field: "flex flex-col gap-1.5 text-right [&_label]:text-[13px] [&_label]:font-semibold [&_label]:text-graphite",
  input: pubInputCls,
  textarea: cn(pubInputCls, "min-h-[100px] h-auto resize-y py-3 leading-relaxed"),
  stepCard: "bubble-card p-5 sm:p-6",
  stepNav: "mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5",
  stepNavActions: "flex flex-row-reverse flex-wrap items-center gap-3",
  req: "text-red-800 font-black",
  inlineLabel: "text-[13px] font-bold text-graphite",
  fieldSpan2: "col-span-full",
  entryRow: "mt-0.5 flex w-full flex-wrap items-center justify-start gap-x-3 gap-y-2",
  radioLbl:
    "inline-flex cursor-pointer items-center gap-2 text-[15px] font-semibold text-graphite [&_input]:h-[18px] [&_input]:w-[18px] [&_input]:shrink-0 [&_input]:accent-[#009DE0]",
  featuresGrid: "flex flex-wrap justify-end gap-2",
  featureChip:
    "inline-flex cursor-pointer select-none items-center gap-2 rounded-full border border-[#e9edf7] bg-[#F5FAFC] px-3.5 py-2 text-sm font-bold [&_input]:h-4 [&_input]:w-4 [&_input]:accent-[#009DE0]",
  featureChipOn: "!border-brand/35 !bg-brand/10",
  mediaRow: "mb-3 flex flex-wrap justify-end gap-2.5",
  thumb: "relative h-20 w-20 overflow-hidden rounded-xl border border-[#e9edf7] [&_img]:h-full [&_img]:w-full [&_img]:object-cover",
  thumbRemove:
    "absolute top-1 left-1 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border-0 bg-[#101820]/70 text-sm font-black text-white",
  addPhoto:
    "inline-flex min-h-10 cursor-pointer items-center justify-center rounded-full border border-dashed border-[#e9edf7] bg-[#F5FAFC] px-4 text-sm font-bold text-graphite [&_input]:hidden",
  videoRow: "flex flex-col items-end gap-2",
  videoPreview: "w-full overflow-hidden rounded-xl border border-[#e9edf7] bg-[#101820]",
  videoPreviewEl: "block max-h-[220px] w-full bg-black",
  videoName: "max-w-full truncate text-[13px] font-semibold text-graphite/50",
  publisherReadonly: "m-0 text-right text-[15px] font-medium text-graphite [&_strong]:font-bold",
  check:
    "mb-2.5 flex items-start gap-2.5 text-right [&_input]:mt-0.5 [&_input]:h-[18px] [&_input]:w-[18px] [&_input]:shrink-0 [&_input]:accent-[#009DE0] [&_span]:text-sm [&_span]:font-medium [&_span]:leading-snug [&_span]:text-graphite",
  btnPrimary: cn(
    bubble.btnPrimary,
    "inline-flex min-h-11 min-w-[8rem] items-center justify-center px-7 py-3 text-[15px] disabled:cursor-not-allowed",
  ),
  btnSecondary: cn(
    bubble.btnOutline,
    "inline-flex min-h-11 min-w-[6rem] items-center justify-center px-6 py-3 text-[15px] disabled:cursor-not-allowed disabled:opacity-45",
  ),
  exitLink:
    "inline-flex min-h-11 items-center text-[15px] font-semibold text-graphite/55 underline-offset-2 transition hover:text-brand hover:underline",
  progress: "mt-2 text-right text-xs font-bold text-graphite/45",
  errorBanner:
    "mt-3 rounded-xl border border-red-800/20 bg-red-500/10 px-3 py-2 text-right text-xs font-bold text-[#7a1520]",
  successBanner:
    "mt-3 rounded-xl border border-[#009DE0]/30 bg-[#E8F5FD]/60 px-3.5 py-3 text-right [&_a]:inline-flex [&_a]:text-sm [&_a]:font-bold [&_a]:text-[#009DE0] [&_a]:underline [&_p]:mb-2 [&_p]:text-sm [&_p]:font-semibold [&_p]:text-graphite",
} as const;


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

type ImageSlot =
  | { id: string; kind: "local"; file: File; preview: string }
  | { id: string; kind: "remote"; preview: string; url: string };

function imagesFromGalleryUrls(urls: string[]): ImageSlot[] {
  return urls.map((url, index) => ({
    id: `remote-${index}-${url.slice(-12)}`,
    kind: "remote" as const,
    preview: url,
    url,
  }));
}

function applyPublishFormSeed(
  seed: ListingPublishFormSeed,
  setters: {
    setTitle: (v: string) => void;
    setContactPhone: (v: string) => void;
    setResolvedLocation: (v: ResolvedLocation | null) => void;
    setHouseNumber: (v: string) => void;
    setPropertyTypeId: (v: string) => void;
    setPropertyConditionId: (v: string) => void;
    setPriceIls: (v: string) => void;
    setRoomsOptionId: (v: string) => void;
    setSizeSqm: (v: string) => void;
    setFloor: (v: string) => void;
    setTotalFloors: (v: string) => void;
    setEntryImmediate: (v: boolean) => void;
    setEntryDateIso: (v: string) => void;
    setDescription: (v: string) => void;
    setFeatures: (v: PropertyFeature[]) => void;
    setImages: (v: ImageSlot[]) => void;
    setExistingVideo: (v: ListingVideo | null) => void;
    setVideoRemoved: (v: boolean) => void;
    setVideoFile: (v: File | null) => void;
    setVideoDurationSec: (v: number | null) => void;
    setAcceptTerms: (v: boolean) => void;
    setAcceptNoBroker: (v: boolean) => void;
  },
) {
  setters.setTitle(seed.title);
  setters.setContactPhone(seed.contactPhone);
  setters.setHouseNumber(seed.houseNumber);
  setters.setPropertyTypeId(seed.propertyTypeId);
  setters.setPropertyConditionId(seed.propertyConditionId);
  setters.setPriceIls(seed.priceIls);
  setters.setRoomsOptionId(seed.roomsOptionId);
  setters.setSizeSqm(seed.sizeSqm);
  setters.setFloor(seed.floor);
  setters.setTotalFloors(seed.totalFloors);
  setters.setEntryImmediate(seed.entryImmediate);
  setters.setEntryDateIso(seed.entryDateIso);
  setters.setDescription(seed.description);
  setters.setFeatures(seed.features);
  setters.setImages(imagesFromGalleryUrls(seed.galleryUrls));
  setters.setExistingVideo(seed.video ?? null);
  setters.setVideoRemoved(false);
  setters.setVideoFile(null);
  setters.setVideoDurationSec(null);
  setters.setAcceptTerms(true);
  setters.setAcceptNoBroker(true);
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function randomId(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getVideoDurationSeconds(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      const d = video.duration;
      if (!Number.isFinite(d) || d <= 0) {
        reject(new Error("VIDEO_DURATION"));
        return;
      }
      resolve(d);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("VIDEO_LOAD"));
    };
    video.src = url;
  });
}

export function PublishListingClient() {
  const router = useRouter();
  const { user, loading, openAuthModal, displayNameForUi } = useLobbyAuth();
  const searchParams = useSearchParams();
  const editListingId = searchParams.get("listingId");
  const isEditMode = Boolean(editListingId);
  const publishAsActive = listingPublishStatusForNewSave() === "active";
  const pageTitle = isEditMode ? "עריכת מודעה" : "פרסום דירה";
  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const [editLoading, setEditLoading] = useState(Boolean(editListingId));
  const [editLoadError, setEditLoadError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [resolvedLocation, setResolvedLocation] = useState<ResolvedLocation | null>(null);
  const [houseNumber, setHouseNumber] = useState("");
  const [propertyTypeId, setPropertyTypeId] = useState("");
  const [propertyConditionId, setPropertyConditionId] = useState("");
  const [priceIls, setPriceIls] = useState("");
  const [roomsOptionId, setRoomsOptionId] = useState("");
  const [sizeSqm, setSizeSqm] = useState("");
  const [floor, setFloor] = useState("");
  const [totalFloors, setTotalFloors] = useState("");
  const [entryImmediate, setEntryImmediate] = useState(true);
  const [entryDateIso, setEntryDateIso] = useState(todayIsoDate);
  const [description, setDescription] = useState("");
  const [features, setFeatures] = useState<PropertyFeature[]>([]);
  const [images, setImages] = useState<ImageSlot[]>([]);
  const [existingVideo, setExistingVideo] = useState<ListingVideo | null>(null);
  const [videoRemoved, setVideoRemoved] = useState(false);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoDurationSec, setVideoDurationSec] = useState<number | null>(null);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptNoBroker, setAcceptNoBroker] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [sentForModerationReview, setSentForModerationReview] = useState(false);
  const [requiresModerationResubmit, setRequiresModerationResubmit] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);

  const roomPickerOptions = useMemo(() => {
    if (!roomsOptionId || LISTING_PUBLISH_ROOM_OPTIONS.some((o) => o.id === roomsOptionId)) {
      return LISTING_PUBLISH_ROOM_OPTIONS;
    }
    return [...LISTING_PUBLISH_ROOM_OPTIONS, { id: roomsOptionId, label: roomsOptionId, minRooms: null, maxRooms: null }];
  }, [roomsOptionId]);

  const toggleFeature = useCallback((key: PropertyFeature) => {
    setFeatures((prev) => (prev.includes(key) ? prev.filter((f) => f !== key) : [...prev, key]));
  }, []);

  const addImages = useCallback((fileList: FileList | null) => {
    if (!fileList?.length) {
      return;
    }
    const next: ImageSlot[] = [];
    for (const file of Array.from(fileList)) {
      if (!file.type.startsWith("image/")) {
        continue;
      }
      next.push({ id: randomId(), kind: "local", file, preview: URL.createObjectURL(file) });
    }
    if (next.length === 0) {
      return;
    }
    setImages((prev) => {
      const merged = [...prev, ...next];
      return merged.slice(0, LISTING_MEDIA_LIMITS.maxImages);
    });
  }, []);

  const removeImage = useCallback((id: string) => {
    setImages((prev) => {
      const slot = prev.find((i) => i.id === id);
      if (slot?.kind === "local") {
        URL.revokeObjectURL(slot.preview);
      }
      return prev.filter((i) => i.id !== id);
    });
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
          setEditLoadError("המודעה כבר נשלחה לבדיקת הצוות. נודיע כשיאושר או אם נדרש תיקון נוסף.");
          return;
        }
        setRequiresModerationResubmit(listing.moderationAction === "returned_to_draft");
        applyPublishFormSeed(rentalListingToPublishFormSeed(listing), {
          setTitle,
          setResolvedLocation,
          setHouseNumber,
          setPropertyTypeId,
          setPropertyConditionId,
          setPriceIls,
          setRoomsOptionId,
          setSizeSqm,
          setFloor,
          setTotalFloors,
          setEntryImmediate,
          setEntryDateIso,
          setDescription,
          setFeatures,
          setImages,
          setExistingVideo,
          setVideoRemoved,
          setVideoFile,
          setVideoDurationSec,
          setAcceptTerms,
          setAcceptNoBroker,
        });
        setResolvedLocation(rentalListingToResolvedLocation(listing));
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

  const onVideoChange = useCallback(async (fileList: FileList | null) => {
    const file = fileList?.[0];
    if (!file || !file.type.startsWith("video/")) {
      setVideoFile(null);
      setVideoDurationSec(null);
      return;
    }
    try {
      const duration = await getVideoDurationSeconds(file);
      if (duration > LISTING_MEDIA_LIMITS.maxVideoDurationSeconds + 0.5) {
        setError(`אורך הסרטון חייב להיות עד ${LISTING_MEDIA_LIMITS.maxVideoDurationSeconds} שניות.`);
        setVideoFile(null);
        setVideoDurationSec(null);
        return;
      }
      setError(null);
      setVideoFile(file);
      setVideoDurationSec(Math.round(duration));
      setVideoRemoved(false);
      setExistingVideo(null);
    } catch {
      setError("לא ניתן לקרוא את אורך הסרטון. נסו קובץ אחר.");
      setVideoFile(null);
      setVideoDurationSec(null);
    }
  }, []);

  const clearVideo = useCallback(() => {
    if (videoFile) {
      setVideoFile(null);
      setVideoDurationSec(null);
      if (videoInputRef.current) {
        videoInputRef.current.value = "";
      }
      return;
    }
    setVideoRemoved(true);
    setExistingVideo(null);
  }, [videoFile]);

  const hasVideoAttached = Boolean(
    (videoFile && videoDurationSec != null) || (existingVideo && !videoRemoved),
  );

  const videoPreviewSrc = useMemo(() => {
    if (videoRemoved) {
      return null;
    }
    if (videoFile) {
      return URL.createObjectURL(videoFile);
    }
    if (existingVideo?.url) {
      return existingVideo.url;
    }
    return null;
  }, [videoFile, existingVideo, videoRemoved]);

  useEffect(() => {
    if (!videoFile || !videoPreviewSrc?.startsWith("blob:")) {
      return;
    }
    return () => {
      URL.revokeObjectURL(videoPreviewSrc);
    };
  }, [videoFile, videoPreviewSrc]);

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
    if (!roomsOptionId) {
      return "נא לבחור מספר חדרים.";
    }
    if (publishRoomsFromOptionId(roomsOptionId) == null) {
      return "נא לבחור מספר חדרים תקין.";
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
    const phoneError = listingContactPhoneValidationError(contactPhone);
    if (phoneError) {
      return phoneError;
    }
    if (!description.trim()) {
      return "נא למלא תיאור (״על הדירה״).";
    }
    if (description.trim().length > LISTING_DESCRIPTION_MAX_CHARACTERS) {
      return `התיאור ארוך מדי (עד ${LISTING_DESCRIPTION_MAX_CHARACTERS} תווים).`;
    }
    if (images.length < 1) {
      return "נא להעלות לפחות תמונה אחת.";
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
    contactPhone,
    resolvedLocation,
    houseNumber,
    propertyTypeId,
    propertyConditionId,
    priceIls,
    roomsOptionId,
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

  const validateWizardStep = useCallback(
    (step: number): string | null => {
      if (step === 1) {
        if (!title.trim()) {
          return "נא למלא כותרת למודעה.";
        }
        if (title.trim().length > LISTING_TITLE_MAX_CHARACTERS) {
          return `הכותרת ארוכה מדי (עד ${LISTING_TITLE_MAX_CHARACTERS} תווים).`;
        }
        if (!propertyTypeId) {
          return "נא לבחור סוג נכס.";
        }
        if (!propertyConditionId) {
          return "נא לבחור מצב נכס.";
        }
        if (!roomsOptionId) {
          return "נא לבחור מספר חדרים.";
        }
        if (publishRoomsFromOptionId(roomsOptionId) == null) {
          return "נא לבחור מספר חדרים תקין.";
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
        if (!entryImmediate && !entryDateIso.trim()) {
          return "נא לבחור תאריך כניסה.";
        }
        return null;
      }
      if (step === 2) {
        const locationError = publishLocationIsValid(resolvedLocation, houseNumber);
        return locationError;
      }
      if (step === 3) {
        if (images.length < 1) {
          return "נא להעלות לפחות תמונה אחת.";
        }
        return null;
      }
      if (step === 4) {
        const price = Number(priceIls);
        if (!Number.isFinite(price) || price < 1) {
          return "נא להזין מחיר חודשי תקין בשקלים.";
        }
        if (!description.trim()) {
          return "נא למלא תיאור (״על הדירה״).";
        }
        if (description.trim().length > LISTING_DESCRIPTION_MAX_CHARACTERS) {
          return `התיאור ארוך מדי (עד ${LISTING_DESCRIPTION_MAX_CHARACTERS} תווים).`;
        }
        return null;
      }
      if (step === 5) {
        const phoneError = listingContactPhoneValidationError(contactPhone);
        if (phoneError) {
          return phoneError;
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
      }
      return null;
    },
    [
      title,
      propertyTypeId,
      propertyConditionId,
      roomsOptionId,
      sizeSqm,
      floor,
      totalFloors,
      entryImmediate,
      entryDateIso,
      resolvedLocation,
      houseNumber,
      images.length,
      priceIls,
      description,
      contactPhone,
      acceptTerms,
      acceptNoBroker,
      isEditMode,
    ],
  );

  const goWizardBack = useCallback(() => {
    setError(null);
    setWizardStep((s) => Math.max(1, s - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const goWizardNext = useCallback(() => {
    const stepError = validateWizardStep(wizardStep);
    if (stepError) {
      setError(stepError);
      return;
    }
    setError(null);
    setWizardStep((s) => Math.min(PUBLISH_WIZARD_STEPS.length, s + 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [validateWizardStep, wizardStep]);

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
        if (slot.kind === "remote") {
          galleryUrls.push(slot.url);
          continue;
        }
        setProgress(`מעלים תמונות (${i + 1}/${images.length})…`);
        const url = await uploadListingImage(user.uid, listingId, slot.file, i);
        galleryUrls.push(url);
      }

      let videoPayload: { url: string; durationSeconds: number } | undefined;
      const removeVideo = isEditMode && videoRemoved && !videoFile;
      if (videoFile && videoDurationSec != null) {
        setProgress("מעלים סרטון…");
        const url = await uploadListingVideo(user.uid, listingId, videoFile);
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
        contactPhone: normalizeListingContactPhone(contactPhone),
        title: title.trim(),
        location: resolvedLocation!,
        houseNumber: houseNumber.trim(),
        propertyTypeId,
        propertyTypeLabel: listingPropertyTypeLabel(propertyTypeId),
        propertyConditionId,
        propertyConditionLabel: listingPropertyConditionLabel(propertyConditionId),
        priceIls: Number(priceIls),
        rooms: publishRoomsFromOptionId(roomsOptionId)!,
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
          try {
            await submitListingForReview(listingId);
            setSentForModerationReview(true);
          } catch {
            setSavedId(listingId);
            setError(
              "השינויים נשמרו, אך השליחה לבדיקת הצוות נכשלה. נסו שוב בעוד רגע מכפתור «שמירה ושליחה לבדיקה».",
            );
            setProgress(null);
            return;
          }
        }
      } else {
        await saveListingDraft(payload);
      }

      setProgress(null);
      router.replace(`/listings/${listingId}`);
      return;
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
    videoFile,
    videoDurationSec,
    title,
    contactPhone,
    resolvedLocation,
    houseNumber,
    propertyTypeId,
    propertyConditionId,
    priceIls,
    roomsOptionId,
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
    router,
  ]);

  if (!isFirebaseConfigured()) {
    return (
      <div className={pub.wrap}>
        <div className={pub.gate}>
          <h1>פרסום דירה</h1>
          <p>Firebase לא הוגדר באתר. הוסיפו משתני סביבה כדי להפעיל פרסום.</p>
        </div>
      </div>
    );
  }

  if (loading || editLoading) {
    return (
      <div className={pub.wrap}>
        <p className={pub.hint}>{editLoading ? "טוענים את המודעה לעריכה…" : "טוענים…"}</p>
      </div>
    );
  }

  if (editLoadError) {
    return (
      <div className={pub.wrap}>
        <div className={pub.gate}>
          <h1>{pageTitle}</h1>
          <p>{editLoadError}</p>
          <Link href="/account">חזרה לאזור אישי</Link>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className={pub.wrap}>
        <div className={pub.gate}>
          <h1>פרסום דירה</h1>
          <p>כדי לפרסם מודעה צריך להתחבר או להירשם בחינם. אחרי ההתחברות תוכלו למלא פרטים, להעלות מדיה ולשמור טיוטה.</p>
          <button type="button" onClick={openAuthModal}>
            התחברות / הרשמה
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={pub.wrap}>
      <header className={pub.lead}>
        <h1 className={pub.leadTitle}>{pageTitle}</h1>
        {requiresModerationResubmit ? (
          <p className={cn(pub.hint, "mt-2")}>
            אחרי שמירה המודעה תישלח לבדיקת הצוות לפני חזרה ללוח. זמן הפרסום לא מתקצר בזמן ההמתנה.
          </p>
        ) : null}
      </header>

      <PublishStepper steps={[...PUBLISH_WIZARD_STEPS]} currentStep={wizardStep} className="!mb-3" />

      <form className={pub.stepCard} autoComplete="off" onSubmit={(e) => e.preventDefault()}>
        {/* מונע הצעות אוטומטיות ב-Chrome */}
        <input type="text" className="hidden" tabIndex={-1} aria-hidden autoComplete="off" />
        {wizardStep === 1 ? (
          <>
            <h2 className={pub.stepHeading}>פרטי הנכס</h2>
            <div className={pub.grid2}>
              <div className={cn(pub.field, pub.fieldSpan2)}>
                <label htmlFor="pub-title">כותרת קצרה למודעה</label>
                <input
                  id="pub-title"
                  name="lobby-pub-title"
                  className={pub.input}
                  {...publishNoRemember}
                  value={title}
                  maxLength={LISTING_TITLE_MAX_CHARACTERS}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <PublishSelectField
                id="pub-property-type"
                label="סוג הנכס"
                required
                value={propertyTypeId}
                onChange={setPropertyTypeId}
                options={LISTING_PROPERTY_TYPE_OPTIONS}
                disabled={busy}
              />
              <PublishSelectField
                id="pub-property-condition"
                label="מצב הנכס"
                required
                value={propertyConditionId}
                onChange={setPropertyConditionId}
                options={LISTING_PROPERTY_CONDITION_OPTIONS}
                disabled={busy}
              />
              <PublishSelectField
                id="pub-rooms"
                label="חדרים"
                required
                value={roomsOptionId}
                onChange={setRoomsOptionId}
                options={roomPickerOptions}
                disabled={busy}
              />
              <div className={pub.field}>
                <label htmlFor="pub-sqm">שטח במ״ר</label>
                <input
                  id="pub-sqm"
                  name="lobby-pub-sqm"
                  className={pub.input}
                  {...publishNoRemember}
                  inputMode="numeric"
                  value={sizeSqm}
                  onChange={(e) => setSizeSqm(e.target.value.replace(/[^\d]/g, ""))}
                />
              </div>
              <div className={pub.field}>
                <label htmlFor="pub-floor">קומה</label>
                <input
                  id="pub-floor"
                  name="lobby-pub-floor"
                  className={pub.input}
                  {...publishNoRemember}
                  inputMode="numeric"
                  value={floor}
                  onChange={(e) => setFloor(e.target.value.replace(/[^\d]/g, ""))}
                />
              </div>
              <div className={pub.field}>
                <label htmlFor="pub-total">קומות בבניין</label>
                <input
                  id="pub-total"
                  name="lobby-pub-total-floors"
                  className={pub.input}
                  {...publishNoRemember}
                  inputMode="numeric"
                  value={totalFloors}
                  onChange={(e) => setTotalFloors(e.target.value.replace(/[^\d]/g, ""))}
                />
              </div>
              <div className={cn(pub.field, pub.fieldSpan2, "items-start")}>
                <span className={pub.inlineLabel}>כניסה</span>
                <div className={pub.entryRow}>
                  <label className={pub.radioLbl}>
                    <input type="radio" name="entry-mode" checked={entryImmediate} onChange={() => setEntryImmediate(true)} />
                    מיידי
                  </label>
                  <label className={pub.radioLbl}>
                    <input
                      type="radio"
                      name="entry-mode"
                      checked={!entryImmediate}
                      onChange={() => {
                        setEntryImmediate(false);
                        setEntryDateIso((prev) => prev || todayIsoDate());
                      }}
                    />
                    בתאריך
                  </label>
                  {!entryImmediate ? (
                    <input
                      name="lobby-pub-entry-date"
                      className={cn(pub.input, "min-w-[160px] !w-auto")}
                      type="date"
                      {...publishNoRemember}
                      value={entryDateIso}
                      onChange={(e) => setEntryDateIso(e.target.value)}
                    />
                  ) : null}
                </div>
              </div>
            </div>
          </>
        ) : null}

        {wizardStep === 2 ? (
          <>
            <h2 className={pub.stepHeading}>מיקום</h2>
            <div className={pub.grid2}>
              <div className={cn(pub.field, pub.fieldSpan2)}>
                <span className={pub.inlineLabel}>
                  מיקום הדירה<span className={pub.req}>*</span>
                </span>
                <PublishLocationFields
                  value={resolvedLocation}
                  onChange={setResolvedLocation}
                  disabled={busy}
                  compact
                />
              </div>
              <div className={pub.field}>
                <label htmlFor="pub-house">
                  מספר בית<span className={pub.req}>*</span>
                </label>
                <input
                  id="pub-house"
                  name="lobby-pub-house"
                  className={pub.input}
                  {...publishNoRemember}
                  value={houseNumber}
                  onChange={(e) => setHouseNumber(e.target.value)}
                  disabled={busy}
                />
              </div>
            </div>
          </>
        ) : null}

        {wizardStep === 3 ? (
          <>
            <h2 className={pub.stepHeading}>תמונות וסרטון</h2>
            <div className={pub.mediaRow}>
              {images.map((slot) => (
                <div key={slot.id} className={pub.thumb}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={slot.preview} alt="" />
                  <button
                    type="button"
                    className={pub.thumbRemove}
                    onClick={() => removeImage(slot.id)}
                    aria-label="הסרת תמונה"
                  >
                    ×
                  </button>
                </div>
              ))}
              {images.length < LISTING_MEDIA_LIMITS.maxImages ? (
                <label className={pub.addPhoto}>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => {
                      addImages(e.target.files);
                      e.target.value = "";
                    }}
                  />
                  + תמונות
                </label>
              ) : null}
            </div>
            <p className="mb-3 text-right text-[12px] font-medium text-graphite/55">
              לפחות תמונה אחת · עד {LISTING_MEDIA_LIMITS.maxImages} תמונות
            </p>
            <div className={pub.videoRow}>
              <label className={pub.addPhoto}>
                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/*"
                  onChange={(e) => void onVideoChange(e.target.files)}
                />
                {hasVideoAttached ? "החלפת סרטון" : "סרטון (אופציונלי)"}
              </label>
              {hasVideoAttached && videoPreviewSrc ? (
                <>
                  <div className={pub.videoPreview}>
                    <video
                      className={pub.videoPreviewEl}
                      src={videoPreviewSrc}
                      controls
                      playsInline
                      preload="metadata"
                    />
                  </div>
                  <span className={pub.videoName}>
                    {videoFile
                      ? videoFile.name
                      : `סרטון קיים (${existingVideo?.durationSeconds ?? videoDurationSec ?? 0} שנ׳)`}
                  </span>
                  <button type="button" className={pub.btnSecondary} onClick={clearVideo}>
                    הסרת סרטון
                  </button>
                </>
              ) : null}
            </div>
          </>
        ) : null}

        {wizardStep === 4 ? (
          <>
            <h2 className={pub.stepHeading}>תיאור ומחיר</h2>
            <div className={pub.grid2}>
              <div className={pub.field}>
                <label htmlFor="pub-price">מחיר לחודש (₪)</label>
                <input
                  id="pub-price"
                  name="lobby-pub-price"
                  className={pub.input}
                  {...publishNoRemember}
                  inputMode="numeric"
                  value={priceIls}
                  onChange={(e) => setPriceIls(e.target.value.replace(/[^\d]/g, ""))}
                />
              </div>
              <div className={cn(pub.field, pub.fieldSpan2)}>
                <label htmlFor="pub-desc">תיאור חופשי</label>
                <textarea
                  id="pub-desc"
                  name="lobby-pub-description"
                  className={pub.textarea}
                  {...publishNoRemember}
                  value={description}
                  maxLength={LISTING_DESCRIPTION_MAX_CHARACTERS}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div className={cn(pub.field, pub.fieldSpan2)}>
                <span className={pub.inlineLabel}>מאפיינים</span>
                <div className={pub.featuresGrid}>
                  {ALL_FEATURES.map((key) => {
                    const on = features.includes(key);
                    return (
                      <label key={key} className={cn(pub.featureChip, on && pub.featureChipOn)}>
                        <input type="checkbox" checked={on} onChange={() => toggleFeature(key)} />
                        {featureLabels[key]}
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          </>
        ) : null}

        {wizardStep === 5 ? (
          <>
            <h2 className={pub.stepHeading}>סיום ופרסום</h2>
            <div className={pub.grid2}>
              <div className={cn(pub.field, pub.fieldSpan2)}>
                <label htmlFor="publish-contact-phone">
                  טלפון ליצירת קשר <span className={pub.req}>*</span>
                </label>
                <input
                  id="publish-contact-phone"
                  name="lobby-pub-phone"
                  type="tel"
                  inputMode="tel"
                  dir="ltr"
                  className={cn(pub.input, "text-left")}
                  placeholder="05X-XXXXXXX"
                  {...publishNoRemember}
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                />
                <p className="m-0 text-right text-[12px] font-medium text-graphite/55">
                  מוצג במודעה לשוכרים שרוצים להתקשר.
                </p>
              </div>
              <div className={cn(pub.field, pub.fieldSpan2)}>
                <p className={pub.publisherReadonly}>
                  שם להצגה: <strong>{displayNameForUi}</strong>
                </p>
              </div>
            </div>
            {!isEditMode ? (
              <div className="mt-3 border-t border-slate-100 pt-3">
                <h3 className="mb-2 text-right text-xs font-bold text-graphite">אישורים</h3>
                <label className={pub.check}>
                  <input type="checkbox" checked={acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)} />
                  <span>קראתי ומסכימים לתנאי השימוש, מדיניות הפרסום והנגישות של Lobby.</span>
                </label>
                <label className={pub.check}>
                  <input type="checkbox" checked={acceptNoBroker} onChange={(e) => setAcceptNoBroker(e.target.checked)} />
                  <span>מאשרים שהמודעה אינה דורשת דמי תיווך או עמלה מהשוכר, ושהמידע נכון לידיעתכם.</span>
                </label>
              </div>
            ) : null}
          </>
        ) : null}

        {error ? (
          <div className={cn(pub.errorBanner, "mt-4")} role="alert">
            {error}
          </div>
        ) : null}

        <div className={pub.stepNav}>
          <div className={pub.stepNavActions}>
            {wizardStep < 5 ? (
              <>
                <button type="button" className={pub.btnPrimary} onClick={goWizardNext}>
                  המשך
                </button>
                <button
                  type="button"
                  className={pub.btnSecondary}
                  disabled={wizardStep === 1}
                  onClick={goWizardBack}
                >
                  חזרה
                </button>
              </>
            ) : (
              <>
                <button type="button" className={pub.btnPrimary} disabled={busy} onClick={() => void handleSubmit()}>
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
                </button>
                <button type="button" className={pub.btnSecondary} disabled={busy} onClick={goWizardBack}>
                  חזרה
                </button>
              </>
            )}
          </div>
          <Link href="/" className={pub.exitLink}>
            חזרה לפיד
          </Link>
        </div>
      </form>
      {progress ? <p className={pub.progress}>{progress}</p> : null}
      {savedId ? (
        <div className={pub.successBanner}>
          <p>
            {sentForModerationReview
              ? "המודעה נשלחה לבדיקת הצוות. נודיע כשתאושר ותחזור ללוח — זמן הפרסום נשמר."
              : isEditMode
                ? "השינויים נשמרו."
                : publishAsActive
                  ? "המודעה פורסמה בפיד."
                  : "הטיוטה נשמרה."}
          </p>
          <Link href={sentForModerationReview ? "/account" : `/listings/${savedId}`}>
            {sentForModerationReview ? "חזרה לאזור אישי" : "צפייה במודעה"}
          </Link>
        </div>
      ) : null}
    </div>
  );
}
