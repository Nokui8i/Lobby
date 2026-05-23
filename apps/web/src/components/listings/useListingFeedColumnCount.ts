"use client";

import { useEffect, useState } from "react";

/** תואם ל־LISTING_FEED_GRID_CLASS: 2 / 3 / 4 עמודות */
export function useListingFeedColumnCount(): number {
  const [columnCount, setColumnCount] = useState(2);

  useEffect(() => {
    const sync = () => {
      const w = window.innerWidth;
      if (w >= 1280) {
        setColumnCount(4);
      } else if (w >= 768) {
        setColumnCount(3);
      } else {
        setColumnCount(2);
      }
    };
    sync();
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, []);

  return columnCount;
}
