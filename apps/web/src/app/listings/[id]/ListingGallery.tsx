"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Play } from "lucide-react";
import type { ListingVideo } from "@lobby/shared";
import { SaveListingButton } from "@/components/SaveListingButton";
import { ListingVideoPlayer } from "./ListingVideoPlayer";
import { cn } from "@/lib/utils";

type GallerySlide =
  | { kind: "image"; url: string; imageIndex: number }
  | { kind: "video"; video: ListingVideo };

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

function preloadUrls(urls: string[]) {
  for (const url of urls) {
    const img = new window.Image();
    img.decoding = "async";
    img.src = url;
  }
}

export function ListingGallery({
  imageUrl,
  gallery,
  title,
  listingId,
  priceIls,
  video = null,
}: {
  imageUrl: string;
  gallery: string[];
  title: string;
  listingId: string;
  priceIls: number;
  video?: ListingVideo | null;
}) {
  const imageUrls = useMemo(() => dedupeGalleryUrls(imageUrl, gallery), [imageUrl, gallery]);

  const slides = useMemo((): GallerySlide[] => {
    const imageSlides: GallerySlide[] = imageUrls.map((url, imageIndex) => ({
      kind: "image",
      url,
      imageIndex,
    }));
    if (video?.url) {
      imageSlides.push({ kind: "video", video });
    }
    return imageSlides;
  }, [imageUrls, video]);

  const [active, setActive] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImageIndex, setLightboxImageIndex] = useState(0);
  const stripRef = useRef<HTMLDivElement>(null);
  const thumbRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const activeSlide = slides[active];
  const isVideoActive = activeSlide?.kind === "video";

  const openLightbox = useCallback((imageIndex: number) => {
    const slideIdx = slides.findIndex((s) => s.kind === "image" && s.imageIndex === imageIndex);
    if (slideIdx >= 0) {
      setActive(slideIdx);
    }
    setLightboxImageIndex(imageIndex);
    setLightboxOpen(true);
  }, [slides]);

  const goPrevImage = useCallback(() => {
    setLightboxImageIndex((i) => (i - 1 + imageUrls.length) % imageUrls.length);
  }, [imageUrls.length]);

  const goNextImage = useCallback(() => {
    setLightboxImageIndex((i) => (i + 1) % imageUrls.length);
  }, [imageUrls.length]);

  useEffect(() => {
    preloadUrls(imageUrls);
  }, [imageUrls]);

  useEffect(() => {
    if (active >= slides.length) {
      setActive(0);
    }
  }, [active, slides.length]);

  useEffect(() => {
    thumbRefs.current[active]?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }, [active]);

  useEffect(() => {
    if (!lightboxOpen) {
      return;
    }
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setLightboxOpen(false);
      }
      if (e.key === "ArrowRight" && imageUrls.length > 1) {
        goNextImage();
      }
      if (e.key === "ArrowLeft" && imageUrls.length > 1) {
        goPrevImage();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [lightboxOpen, imageUrls.length, goNextImage, goPrevImage]);

  function scrollStrip(direction: "prev" | "next") {
    const el = stripRef.current;
    if (!el) {
      return;
    }
    const step = Math.max(160, Math.round(el.clientWidth * 0.75));
    el.scrollBy({ left: direction === "next" ? step : -step, behavior: "smooth" });
  }

  if (slides.length === 0) {
    return (
      <div className="grid min-h-[180px] place-items-center rounded-[20px] bg-soft text-[15px] font-bold text-graphite/50">
        אין תמונות למודעה
      </div>
    );
  }

  const showStripArrows = slides.length > 4;
  const lightboxUrl = imageUrls[lightboxImageIndex];

  return (
    <>
      <div
        className="bubble-card mx-auto w-full max-w-[720px] overflow-hidden shadow-bubble sm:max-w-[800px]"
        style={{ borderRadius: 20 }}
      >
        <div className="relative aspect-[3/2] w-full overflow-hidden bg-slate-100">
          {imageUrls.map((url, index) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={url}
              src={url}
              alt={!isVideoActive && activeSlide?.kind === "image" && activeSlide.imageIndex === index ? title : ""}
              decoding="async"
              className={cn(
                "absolute inset-0 h-full w-full object-cover transition-opacity duration-150",
                !isVideoActive && activeSlide?.kind === "image" && activeSlide.imageIndex === index
                  ? "opacity-100"
                  : "pointer-events-none opacity-0",
              )}
            />
          ))}

          {isVideoActive && activeSlide.kind === "video" ? (
            <ListingVideoPlayer video={activeSlide.video} title={title} embedded />
          ) : null}

          {!isVideoActive ? (
            <button
              type="button"
              className="absolute inset-0 z-[1] cursor-zoom-in border-0 bg-transparent p-0"
              onClick={() => {
                if (activeSlide?.kind === "image") {
                  openLightbox(activeSlide.imageIndex);
                }
              }}
              aria-label="תצוגת תמונה במסך מלא"
            />
          ) : null}

          <div className="pointer-events-none absolute left-4 top-4 z-[2]">
            <SaveListingButton
              listingId={listingId}
              listingTitle={title}
              imageUrl={imageUrl}
              priceIls={priceIls}
              variant="gallery"
              className="pointer-events-auto"
            />
          </div>
        </div>

        {slides.length > 1 ? (
          <div className="relative border-t border-slate-100">
            {showStripArrows ? (
              <>
                <button
                  type="button"
                  className="absolute left-1 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200/90 bg-white/95 text-graphite shadow-sm transition hover:bg-white"
                  aria-label="גלילה אחורה"
                  onClick={() => scrollStrip("prev")}
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className="absolute right-1 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200/90 bg-white/95 text-graphite shadow-sm transition hover:bg-white"
                  aria-label="גלילה קדימה"
                  onClick={() => scrollStrip("next")}
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </>
            ) : null}

            <div
              ref={stripRef}
              className={cn(
                "flex gap-2 overflow-x-auto scroll-smooth p-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
                showStripArrows && "px-11",
              )}
              dir="ltr"
              role="tablist"
              aria-label="תמונות וסרטון"
            >
              {slides.map((slide, index) => (
                <button
                  key={slide.kind === "image" ? slide.url : "video"}
                  ref={(el) => {
                    thumbRefs.current[index] = el;
                  }}
                  type="button"
                  role="tab"
                  onClick={() => setActive(index)}
                  className={cn(
                    "relative h-16 w-24 shrink-0 snap-center overflow-hidden rounded-xl border-2 bg-white transition sm:h-[68px] sm:w-[104px]",
                    active === index
                      ? "border-brand shadow-puffy opacity-100"
                      : "border-transparent opacity-70 hover:opacity-100",
                  )}
                  aria-label={slide.kind === "video" ? "סרטון" : `תמונה ${slide.imageIndex + 1}`}
                  aria-selected={active === index}
                >
                  {slide.kind === "image" ? (
                    <Image src={slide.url} alt="" fill className="object-cover object-center" sizes="104px" />
                  ) : (
                    <>
                      {imageUrls[0] ? (
                        <Image
                          src={slide.video.thumbnailUrl ?? imageUrls[0]!}
                          alt=""
                          fill
                          className="object-cover object-center opacity-80"
                          sizes="104px"
                        />
                      ) : (
                        <span className="absolute inset-0 bg-[#101820]" />
                      )}
                      <span className="absolute inset-0 grid place-items-center bg-black/35">
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-graphite shadow-sm">
                          <Play className="h-4 w-4 fill-current ps-0.5" aria-hidden />
                        </span>
                      </span>
                      {slide.video.durationSeconds > 0 ? (
                        <span className="absolute bottom-1.5 end-1.5 rounded-md bg-black/55 px-1.5 py-0.5 text-[10px] font-bold text-white">
                          {slide.video.durationSeconds} שנ׳
                        </span>
                      ) : null}
                    </>
                  )}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {lightboxOpen && lightboxUrl ? (
        <div
          className="fixed inset-0 z-[100] flex flex-col bg-[#0a0c0e]/94 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="תמונה במסך מלא"
          onClick={() => setLightboxOpen(false)}
        >
          <div className="mx-auto flex w-full max-w-[1200px] items-center justify-between gap-3 py-1">
            <span className="text-sm font-semibold text-white/80">
              {lightboxImageIndex + 1} / {imageUrls.length}
            </span>
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-2xl leading-none text-white"
              onClick={(e) => {
                e.stopPropagation();
                setLightboxOpen(false);
              }}
              aria-label="סגירה"
            >
              ×
            </button>
          </div>

          <div
            className="relative mx-auto flex min-h-0 w-full max-w-[1200px] flex-1 items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {imageUrls.length > 1 ? (
              <>
                <button
                  type="button"
                  className="absolute end-2 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-xl font-bold text-white sm:end-4"
                  aria-label="תמונה הבאה"
                  onClick={goNextImage}
                >
                  ›
                </button>
                <button
                  type="button"
                  className="absolute start-2 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-xl font-bold text-white sm:start-4"
                  aria-label="תמונה קודמת"
                  onClick={goPrevImage}
                >
                  ‹
                </button>
              </>
            ) : null}

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightboxUrl}
              alt={`${title} — תמונה ${lightboxImageIndex + 1}`}
              className="max-h-[min(78vh,900px)] max-w-full object-contain"
            />
          </div>

          {imageUrls.length > 1 ? (
            <div
              className="mx-auto flex w-full max-w-[1200px] gap-2 overflow-x-auto pb-2 pt-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              dir="ltr"
              onClick={(e) => e.stopPropagation()}
            >
              {imageUrls.map((url, index) => (
                <button
                  key={`lb-${url}-${index}`}
                  type="button"
                  onClick={() => setLightboxImageIndex(index)}
                  className={cn(
                    "relative h-14 w-20 shrink-0 overflow-hidden rounded-lg border-2 sm:h-16 sm:w-24",
                    lightboxImageIndex === index ? "border-brand opacity-100" : "border-transparent opacity-60",
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
