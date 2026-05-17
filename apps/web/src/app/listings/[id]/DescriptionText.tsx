"use client";

import { useState } from "react";
import { LISTING_DESCRIPTION_MAX_CHARACTERS } from "@lobby/shared";
import styles from "./page.module.css";

const DESCRIPTION_TOGGLE_THRESHOLD = 110;

export function DescriptionText({ text }: { text: string }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const description = text.trim().slice(0, LISTING_DESCRIPTION_MAX_CHARACTERS);
  const shouldShowToggle = description.length > DESCRIPTION_TOGGLE_THRESHOLD;

  return (
    <div className={styles.descriptionWrap}>
      <p
        className={`${styles.description} ${
          !isExpanded && shouldShowToggle ? styles.descriptionCollapsed : ""
        }`}
      >
        {description}
      </p>
      {shouldShowToggle ? (
        <button
          className={styles.descriptionToggle}
          type="button"
          onClick={() => setIsExpanded((current) => !current)}
        >
          {isExpanded ? "הצג פחות" : "הצג עוד"}
        </button>
      ) : null}
    </div>
  );
}
