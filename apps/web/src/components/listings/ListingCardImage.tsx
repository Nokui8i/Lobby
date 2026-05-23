"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { LISTING_CARD_IMAGE_OBJECT_CLASS } from "@/components/listings/listingCardStyles";
import { cn } from "@/lib/utils";

/** תמונת כרטיס מודעה — עם גיבוי אם הקישור נשבר (404 / אופטימיזציה). */
export const LISTING_CARD_IMAGE_FALLBACK =
  "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=960&h=540&q=80";

export function ListingCardImage({
  src,
  alt,
  sizes,
  featured = false,
}: {
  src: string;
  alt: string;
  sizes: string;
  featured?: boolean;
}) {
  const [resolvedSrc, setResolvedSrc] = useState(src || LISTING_CARD_IMAGE_FALLBACK);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setResolvedSrc(src?.trim() || LISTING_CARD_IMAGE_FALLBACK);
    setFailed(false);
  }, [src]);

  return (
    <Image
      src={failed ? LISTING_CARD_IMAGE_FALLBACK : resolvedSrc}
      alt={alt}
      fill
      sizes={sizes}
      loading="lazy"
      className={cn(
        LISTING_CARD_IMAGE_OBJECT_CLASS,
        "transition duration-300",
        featured ? "group-hover:scale-[1.02]" : "group-hover:scale-[1.015]",
      )}
      onError={() => {
        if (!failed) {
          setFailed(true);
        }
      }}
    />
  );
}
