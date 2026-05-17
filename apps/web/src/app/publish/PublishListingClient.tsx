"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
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
  publishLocationIsValid,
  rentalListingToPublishFormSeed,
  rentalListingToResolvedLocation,
  type ListingPublishFormSeed,
  type ListingVideo,
  type PropertyFeature,
  type ResolvedLocation,
} from "@lobby/shared";
import { PublishLocationFields } from "@/components/PublishLocationFields";
import { useLobbyAuth } from "@/contexts/LobbyAuthContext";
import { ensureFirestoreAuthReady } from "@/lib/firebase/client";
import { isFirebaseConfigured } from "@/lib/firebase/isConfigured";
import { fetchListingByIdFromFirestore } from "@/lib/firebase/listingQueries";
import {
  listingPublishStatusForNewSave,
  newListingDocumentId,
  saveListingDraft,
  updateListing,
  uploadListingImage,
  uploadListingVideo,
} from "@/lib/firebase/publishListing";
import styles from "./publish.module.css";

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
    setResolvedLocation: (v: ResolvedLocation | null) => void;
    setHouseNumber: (v: string) => void;
    setPropertyTypeId: (v: string) => void;
    setPropertyConditionId: (v: string) => void;
    setPriceIls: (v: string) => void;
    setRooms: (v: string) => void;
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
  setters.setHouseNumber(seed.houseNumber);
  setters.setPropertyTypeId(seed.propertyTypeId);
  setters.setPropertyConditionId(seed.propertyConditionId);
  setters.setPriceIls(seed.priceIls);
  setters.setRooms(seed.rooms);
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
        applyPublishFormSeed(rentalListingToPublishFormSeed(listing), {
          setTitle,
          setResolvedLocation,
          setHouseNumber,
          setPropertyTypeId,
          setPropertyConditionId,
          setPriceIls,
          setRooms,
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
    videoFile,
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
  ]);

  if (!isFirebaseConfigured()) {
    return (
      <div className={styles.wrap}>
        <div className={styles.gate}>
          <h1>פרסום דירה</h1>
          <p>Firebase לא הוגדר באתר. הוסיפו משתני סביבה כדי להפעיל פרסום.</p>
        </div>
      </div>
    );
  }

  if (loading || editLoading) {
    return (
      <div className={styles.wrap}>
        <p className={styles.hint}>{editLoading ? "טוענים את המודעה לעריכה…" : "טוענים…"}</p>
      </div>
    );
  }

  if (editLoadError) {
    return (
      <div className={styles.wrap}>
        <div className={styles.gate}>
          <h1>{pageTitle}</h1>
          <p>{editLoadError}</p>
          <Link href="/account">חזרה לאזור אישי</Link>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className={styles.wrap}>
        <div className={styles.gate}>
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
    <div className={styles.wrap}>
      <header className={styles.lead}>
        <h1>{pageTitle}</h1>
      </header>

      <section className={styles.card}>
        <h2>פרטי הנכס</h2>
        <div className={styles.grid2}>
          <div className={styles.field}>
            <label htmlFor="pub-title">כותרת קצרה למודעה</label>
            <input
              id="pub-title"
              value={title}
              maxLength={LISTING_TITLE_MAX_CHARACTERS}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="pub-property-type">
              סוג הנכס<span className={styles.req}>*</span>
            </label>
            <select
              id="pub-property-type"
              className={styles.selectLg}
              value={propertyTypeId}
              onChange={(e) => setPropertyTypeId(e.target.value)}
            >
              <option value="" disabled>
                בחרו
              </option>
              {LISTING_PROPERTY_TYPE_OPTIONS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.field}>
            <label htmlFor="pub-property-condition">
              מצב הנכס<span className={styles.req}>*</span>
            </label>
            <select
              id="pub-property-condition"
              className={styles.selectLg}
              value={propertyConditionId}
              onChange={(e) => setPropertyConditionId(e.target.value)}
            >
              <option value="" disabled>
                בחרו
              </option>
              {LISTING_PROPERTY_CONDITION_OPTIONS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className={`${styles.field} ${styles.fieldSpan2}`}>
            <span className={styles.inlineLabel}>
              מיקום הדירה<span className={styles.req}>*</span>
            </span>
            <PublishLocationFields
              value={resolvedLocation}
              onChange={setResolvedLocation}
              disabled={busy}
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="pub-house">
              מספר בית<span className={styles.req}>*</span>
            </label>
            <input
              id="pub-house"
              value={houseNumber}
              onChange={(e) => setHouseNumber(e.target.value)}
              disabled={busy}
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="pub-price">מחיר לחודש (₪)</label>
            <input
              id="pub-price"
              inputMode="numeric"
              value={priceIls}
              onChange={(e) => setPriceIls(e.target.value.replace(/[^\d]/g, ""))}
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="pub-rooms">חדרים</label>
            <input
              id="pub-rooms"
              inputMode="decimal"
              value={rooms}
              onChange={(e) => setRooms(e.target.value.replace(/[^\d.]/g, ""))}
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="pub-sqm">שטח במ״ר</label>
            <input
              id="pub-sqm"
              inputMode="numeric"
              value={sizeSqm}
              onChange={(e) => setSizeSqm(e.target.value.replace(/[^\d]/g, ""))}
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="pub-floor">קומה</label>
            <input
              id="pub-floor"
              inputMode="numeric"
              value={floor}
              onChange={(e) => setFloor(e.target.value.replace(/[^\d]/g, ""))}
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="pub-total">קומות בבניין</label>
            <input
              id="pub-total"
              inputMode="numeric"
              value={totalFloors}
              onChange={(e) => setTotalFloors(e.target.value.replace(/[^\d]/g, ""))}
            />
          </div>
          <div className={styles.field} style={{ gridColumn: "1 / -1" }}>
            <span className={styles.inlineLabel}>כניסה</span>
            <div className={styles.entryRow}>
              <label className={styles.radioLbl}>
                <input type="radio" name="entry-mode" checked={entryImmediate} onChange={() => setEntryImmediate(true)} />
                מיידי
              </label>
              <label className={styles.radioLbl}>
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
                  className={styles.dateInput}
                  type="date"
                  value={entryDateIso}
                  onChange={(e) => setEntryDateIso(e.target.value)}
                />
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className={styles.card}>
        <h2>על הדירה</h2>
        <div className={styles.field}>
          <label htmlFor="pub-desc">תיאור חופשי</label>
          <textarea
            id="pub-desc"
            value={description}
            maxLength={LISTING_DESCRIPTION_MAX_CHARACTERS}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
      </section>

      <section className={styles.card}>
        <h2>מאפיינים</h2>
        <div className={styles.featuresGrid}>
          {ALL_FEATURES.map((key) => {
            const on = features.includes(key);
            return (
              <label key={key} className={`${styles.featureChip} ${on ? styles.featureChipOn : ""}`}>
                <input type="checkbox" checked={on} onChange={() => toggleFeature(key)} />
                {featureLabels[key]}
              </label>
            );
          })}
        </div>
      </section>

      <section className={styles.card}>
        <h2>מדיה</h2>
        <div className={styles.mediaRow}>
          {images.map((slot) => (
            <div key={slot.id} className={styles.thumb}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={slot.preview} alt="" />
              <button type="button" className={styles.thumbRemove} onClick={() => removeImage(slot.id)} aria-label="הסרת תמונה">
                ×
              </button>
            </div>
          ))}
          {images.length < LISTING_MEDIA_LIMITS.maxImages ? (
            <label className={styles.addPhoto}>
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
        <div className={styles.videoRow}>
          <label className={styles.addPhoto}>
            <input
              ref={videoInputRef}
              type="file"
              accept="video/*"
              onChange={(e) => void onVideoChange(e.target.files)}
            />
            {hasVideoAttached ? "החלפת סרטון" : "סרטון"}
          </label>
          {hasVideoAttached && videoPreviewSrc ? (
            <>
              <div className={styles.videoPreview}>
                <video
                  className={styles.videoPreviewEl}
                  src={videoPreviewSrc}
                  controls
                  playsInline
                  preload="metadata"
                />
              </div>
              <span className={styles.videoName}>
                {videoFile
                  ? videoFile.name
                  : `סרטון קיים (${existingVideo?.durationSeconds ?? videoDurationSec ?? 0} שנ׳)`}
              </span>
              <button type="button" className={styles.btnGhost} onClick={clearVideo}>
                הסרת סרטון
              </button>
            </>
          ) : null}
        </div>
      </section>

      <section className={styles.card}>
        <h2>פרטי מפרסם</h2>
        <p className={styles.publisherReadonly}>
          שם להצגה: <strong>{displayNameForUi}</strong>
        </p>
      </section>

      {!isEditMode ? (
        <section className={styles.card}>
          <h2>אישורים</h2>
          <label className={styles.check}>
            <input type="checkbox" checked={acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)} />
            <span>קראתי ומסכימים לתנאי השימוש, מדיניות הפרסום והנגישות של Lobby.</span>
          </label>
          <label className={styles.check}>
            <input type="checkbox" checked={acceptNoBroker} onChange={(e) => setAcceptNoBroker(e.target.checked)} />
            <span>מאשרים שהמודעה אינה דורשת דמי תיווך או עמלה מהשוכר, ושהמידע נכון לידיעתכם.</span>
          </label>
        </section>
      ) : null}

      <div className={styles.actions}>
        <button type="button" className={styles.btnPrimary} disabled={busy} onClick={() => void handleSubmit()}>
          {busy
            ? isEditMode
              ? "שומרים…"
              : publishAsActive
                ? "מפרסמים…"
                : "שומרים…"
            : isEditMode
              ? "שמירת שינויים"
              : publishAsActive
                ? "פרסום לפיד"
                : "שמירת טיוטה"}
        </button>
        <Link href="/" className={styles.btnGhost} style={{ textAlign: "center", lineHeight: 1.2 }}>
          חזרה לפיד
        </Link>
      </div>
      {progress ? <p className={styles.progress}>{progress}</p> : null}
      {error ? (
        <div className={styles.errorBanner} role="alert">
          {error}
        </div>
      ) : null}
      {savedId ? (
        <div className={styles.successBanner}>
          <p>
            {isEditMode ? "השינויים נשמרו." : publishAsActive ? "המודעה פורסמה בפיד." : "הטיוטה נשמרה."}
          </p>
          <Link href={`/listings/${savedId}`}>צפייה במודעה</Link>
        </div>
      ) : null}
    </div>
  );
}
