"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { SaveListingButton } from "@/components/SaveListingButton";
import styles from "./ListingGallery.module.css";

function dedupeGalleryUrls(imageUrl: string, gallery: string[]): string[] {
  const raw = gallery.filter((u) => typeof u === "string" && u.trim().length > 0).map((u) => u.trim());
  const seen = new Set<string>();
  const out: string[] = [];
  for (const u of raw) {
    if (!seen.has(u)) {
      seen.add(u);
      out.push(u);
    }
  }
  if (out.length > 0) {
    return out;
  }
  const single = imageUrl.trim();
  return single ? [single] : [];
}

export function ListingGallery({
  imageUrl,
  gallery,
  title,
  listingId,
  priceIls,
}: {
  imageUrl: string;
  gallery: string[];
  title: string;
  listingId: string;
  priceIls: number;
}) {
  const urls = useMemo(() => dedupeGalleryUrls(imageUrl, gallery), [imageUrl, gallery]);
  const [selected, setSelected] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  useEffect(() => {
    setSelected((i) => (urls.length ? Math.min(Math.max(0, i), urls.length - 1) : 0));
  }, [urls]);

  const openLightbox = useCallback((index: number) => {
    setSelected(index);
    setLightboxOpen(true);
  }, []);

  useEffect(() => {
    if (!lightboxOpen) {
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setLightboxOpen(false);
      }
      if (e.key === "ArrowRight" && urls.length > 1) {
        setSelected((i) => (i + 1) % urls.length);
      }
      if (e.key === "ArrowLeft" && urls.length > 1) {
        setSelected((i) => (i - 1 + urls.length) % urls.length);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxOpen, urls.length]);

  const goPrev = useCallback(() => {
    setSelected((i) => (i - 1 + urls.length) % urls.length);
  }, [urls.length]);

  const goNext = useCallback(() => {
    setSelected((i) => (i + 1) % urls.length);
  }, [urls.length]);

  if (urls.length === 0) {
    return <div className={styles.galleryEmpty}>אין תמונות למודעה</div>;
  }

  const current = urls[selected]!;

  return (
    <>
      <div className={styles.galleryShell}>
        <div className={styles.galleryMain}>
          <SaveListingButton
            listingId={listingId}
            listingTitle={title}
            imageUrl={imageUrl}
            priceIls={priceIls}
            variant="gallery"
            className={styles.gallerySaveBtn}
          />
          <button
            type="button"
            className={styles.galleryMainBtn}
            onClick={() => openLightbox(selected)}
            aria-label={`הגדלת תמונה ${selected + 1} מתוך ${urls.length}`}
          >
            <div className={styles.galleryMainInner}>
              <Image
                src={current}
                alt={`${title} — תמונה ${selected + 1}`}
                fill
                className={styles.galleryMainImg}
                sizes="(max-width: 820px) 100vw, calc(100vw - 140px)"
                priority={selected === 0}
              />
            </div>
          </button>
        </div>

        {urls.length > 1 ? (
          <div className={styles.galleryThumbRail} role="tablist" aria-label="בחירת תמונה">
            {urls.map((url, index) => (
              <button
                key={`${url}-${index}`}
                type="button"
                role="tab"
                aria-selected={index === selected}
                className={`${styles.galleryThumb} ${index === selected ? styles.galleryThumbOn : ""}`}
                onClick={() => setSelected(index)}
              >
                <Image src={url} alt="" fill className={styles.galleryThumbImg} sizes="88px" />
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {lightboxOpen ? (
        <div
          className={styles.lightbox}
          role="dialog"
          aria-modal="true"
          aria-label="תצוגת תמונה במסך מלא"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            type="button"
            className={styles.lightboxClose}
            onClick={(e) => {
              e.stopPropagation();
              setLightboxOpen(false);
            }}
            aria-label="סגירה"
          >
            ×
          </button>

          {urls.length > 1 ? (
            <>
              <button
                type="button"
                className={`${styles.lightboxNav} ${styles.lightboxNavPrev}`}
                aria-label="תמונה קודמת"
                onClick={(e) => {
                  e.stopPropagation();
                  goPrev();
                }}
              >
                ‹
              </button>
              <button
                type="button"
                className={`${styles.lightboxNav} ${styles.lightboxNavNext}`}
                aria-label="תמונה הבאה"
                onClick={(e) => {
                  e.stopPropagation();
                  goNext();
                }}
              >
                ›
              </button>
            </>
          ) : null}

          <div
            className={styles.lightboxFrame}
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={current} className={styles.lightboxImg} alt={`${title} — תמונה ${selected + 1}`} />
          </div>

          {urls.length > 1 ? (
            <span className={styles.lightboxCounter}>
              {selected + 1} / {urls.length}
            </span>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
