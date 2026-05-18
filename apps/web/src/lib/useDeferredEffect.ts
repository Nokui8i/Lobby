"use client";

import { useEffect, useState } from "react";

/** מפעיל effect רק אחרי idle — מפחית עומס רשת בטעינת עמוד ראשון. */
export function useDeferredReady(immediate = false): boolean {
  const [ready, setReady] = useState(immediate);

  useEffect(() => {
    if (immediate) {
      setReady(true);
      return;
    }

    if (typeof requestIdleCallback === "function") {
      const id = requestIdleCallback(() => setReady(true), { timeout: 1200 });
      return () => cancelIdleCallback(id);
    }

    const t = window.setTimeout(() => setReady(true), 400);
    return () => window.clearTimeout(t);
  }, [immediate]);

  return ready;
}
