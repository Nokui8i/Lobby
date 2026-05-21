"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  HOME_BANNER_AUTO_MS,
  HOME_BANNER_TRANSITION_MS,
  isBannerLinkClickable,
  type HomeBannerSlide,
} from "@lobby/shared";
import { cn } from "@/lib/utils";

function BannerImage({
  slide,
  priority,
  aspectRatio,
  sizes,
}: {
  slide: HomeBannerSlide;
  priority?: boolean;
  aspectRatio: number;
  sizes: string;
}) {
  return (
    <div className="relative w-full bg-slate-100" style={{ aspectRatio }}>
      <Image
        src={slide.src}
        alt={slide.alt}
        fill
        className="object-contain object-center"
        priority={priority}
        sizes={sizes}
      />
    </div>
  );
}

function BannerLink({ slide, children }: { slide: HomeBannerSlide; children: React.ReactNode }) {
  const href = slide.linkUrl.trim();
  if (!isBannerLinkClickable(href)) {
    return <div className="block cursor-default">{children}</div>;
  }
  if (href.startsWith("/")) {
    return (
      <Link href={href} className="block cursor-pointer">
        {children}
      </Link>
    );
  }
  return (
    <a href={href} className="block cursor-pointer" target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}

function SiteBannerStatic({
  slide,
  className,
  aspectRatio,
  sizes,
}: {
  slide: HomeBannerSlide;
  className?: string;
  aspectRatio: number;
  sizes: string;
}) {
  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-2xl shadow-[0_8px_28px_rgba(15,23,42,0.12)]",
        className,
      )}
    >
      <BannerLink slide={slide}>
        <BannerImage slide={slide} priority aspectRatio={aspectRatio} sizes={sizes} />
      </BannerLink>
    </div>
  );
}

export function SiteBannerCarousel({
  slides,
  className,
  aspectRatio,
  sizes = "(max-width: 1280px) 100vw, 1280px",
  showIndicators = true,
  initialSlideIndex = 0,
}: {
  slides: HomeBannerSlide[];
  className?: string;
  aspectRatio: number;
  sizes?: string;
  /** נקודות ניווט בתחתית — כבוי לפרסום חיצוני */
  showIndicators?: boolean;
  /** באיזה באנר להתחיל (פרסום חיצוני — אקראי בכל טעינה) */
  initialSlideIndex?: number;
}) {
  const total = slides.length;
  if (total === 0) return null;
  if (total === 1) {
    return (
      <SiteBannerStatic slide={slides[0]!} className={className} aspectRatio={aspectRatio} sizes={sizes} />
    );
  }

  return (
    <SiteBannerCarouselMulti
      slides={slides}
      className={className}
      aspectRatio={aspectRatio}
      sizes={sizes}
      showIndicators={showIndicators}
      initialSlideIndex={initialSlideIndex}
    />
  );
}

function SiteBannerCarouselMulti({
  slides,
  className,
  aspectRatio,
  sizes,
  showIndicators,
  initialSlideIndex,
}: {
  slides: HomeBannerSlide[];
  className?: string;
  aspectRatio: number;
  sizes: string;
  showIndicators: boolean;
  initialSlideIndex: number;
}) {
  const total = slides.length;
  const safeInitial =
    total <= 1 ? 0 : ((initialSlideIndex % total) + total) % total;
  const [index, setIndex] = useState(safeInitial);

  useEffect(() => {
    setIndex(total <= 1 ? 0 : ((initialSlideIndex % total) + total) % total);
  }, [initialSlideIndex, total]);

  const go = useCallback(
    (next: number) => {
      setIndex(((next % total) + total) % total);
    },
    [total],
  );

  useEffect(() => {
    const t = setTimeout(() => {
      setIndex((current) => (current + 1) % total);
    }, HOME_BANNER_AUTO_MS);
    return () => clearTimeout(t);
  }, [index, total]);

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-2xl shadow-[0_8px_28px_rgba(15,23,42,0.12)]",
        className,
      )}
    >
      <div dir="ltr" className="overflow-hidden">
        <div
          className="flex will-change-transform"
          style={{
            transform: `translate3d(-${index * 100}%, 0, 0)`,
            transition: `transform ${HOME_BANNER_TRANSITION_MS}ms cubic-bezier(0.4, 0, 0.2, 1)`,
          }}
        >
          {slides.map((slide, i) => (
            <div key={slide.id} className="w-full shrink-0 grow-0 basis-full">
              <BannerLink slide={slide}>
                <BannerImage
                  slide={slide}
                  priority={i === 0}
                  aspectRatio={aspectRatio}
                  sizes={sizes}
                />
              </BannerLink>
            </div>
          ))}
        </div>
      </div>

      {showIndicators ? (
        <div className="absolute bottom-2 left-1/2 z-10 hidden -translate-x-1/2 gap-1.5 md:flex">
          {slides.map((s, i) => (
            <button
              key={s.id}
              type="button"
              aria-label={`באנר ${i + 1}`}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                i === index ? "w-5 bg-white" : "w-1.5 bg-white/50 hover:bg-white/75",
              )}
              onClick={() => go(i)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
