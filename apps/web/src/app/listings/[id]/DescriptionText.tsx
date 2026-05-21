"use client";

import { useState } from "react";
import { LISTING_DESCRIPTION_MAX_CHARACTERS } from "@lobby/shared";
import { cn } from "@/lib/utils";

const DESCRIPTION_TOGGLE_THRESHOLD = 110;

export function DescriptionText({ text }: { text: string }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const description = text.trim().slice(0, LISTING_DESCRIPTION_MAX_CHARACTERS);
  const shouldShowToggle = description.length > DESCRIPTION_TOGGLE_THRESHOLD;

  return (
    <div>
      <p
        className={cn(
          "m-0 text-[16px] font-normal leading-[1.75] text-graphite sm:text-[17px]",
          !isExpanded && shouldShowToggle && "line-clamp-4",
        )}
      >
        {description}
      </p>
      {shouldShowToggle ? (
        <button
          className="mt-2 border-0 bg-transparent p-0 text-sm font-bold text-brand hover:underline"
          type="button"
          onClick={() => setIsExpanded((current) => !current)}
        >
          {isExpanded ? "הצג פחות" : "הצג עוד"}
        </button>
      ) : null}
    </div>
  );
}
