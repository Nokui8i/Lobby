"use client";

import { FeedSearchBar } from "@/components/FeedSearchBar";
import { HomeBannersSection } from "@/components/home/HomeBannersSection";
import type { FeedSearchFilters } from "@lobby/shared";
import type { ReactNode } from "react";

/** ראש דף הבית: קרוסלת באנרים (מנוהל באדמין) + חיפוש */
export function HomeFeedHero({
  appliedFilters,
  onSearch,
  loading,
  sortRow,
}: {
  appliedFilters: FeedSearchFilters;
  onSearch: (filters: FeedSearchFilters) => void;
  loading?: boolean;
  /** מיון — מתחת לפילטר, בלי מסגרת */
  sortRow?: ReactNode;
}) {
  return (
    <section className="pb-4 sm:pb-5">
      <div className="mx-auto max-w-[1280px] space-y-3 px-4 sm:px-6">
        <HomeBannersSection />

        <div id="feed-search" className="scroll-mt-24 space-y-1.5">
          <div
            className="bubble-card overflow-visible rounded-[16px] border border-slate-200/90 p-2.5 shadow-[0_1px_2px_rgba(15,23,42,0.05),0_4px_14px_rgba(15,23,42,0.07),0_12px_32px_rgba(15,23,42,0.06)] md:p-3"
          >
            <FeedSearchBar appliedFilters={appliedFilters} onSearch={onSearch} loading={loading} embedded />
          </div>
          {sortRow ? (
            <div className="flex justify-start px-0.5" dir="rtl">
              {sortRow}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
