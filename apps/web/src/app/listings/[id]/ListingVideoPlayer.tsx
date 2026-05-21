"use client";

import type { ListingVideo } from "@lobby/shared";

export function ListingVideoPlayer({
  video,
  title,
  embedded = false,
}: {
  video: ListingVideo;
  title: string;
  /** בתוך גלריית המודעה — בלי כותרת ומסגרת נפרדת */
  embedded?: boolean;
}) {
  if (!video.url) {
    return null;
  }

  if (embedded) {
    return (
      <video
        className="absolute inset-0 h-full w-full bg-[#101820] object-contain"
        src={video.url}
        controls
        playsInline
        preload="metadata"
        poster={video.thumbnailUrl}
        aria-label={`סרטון — ${title}`}
      />
    );
  }

  return (
    <section className="mb-4 text-right" aria-label="סרטון המודעה">
      <div className="mb-2.5 flex flex-row-reverse items-center justify-between gap-2">
        <span className="text-sm font-black text-graphite">סרטון</span>
        {video.durationSeconds > 0 ? (
          <span className="text-[13px] font-bold text-graphite/50">{video.durationSeconds} שנ׳</span>
        ) : null}
      </div>
      <div className="overflow-hidden rounded-[20px] border border-slate-200/90 bg-[#101820]">
        <video
          className="block max-h-[min(56vh,420px)] w-full bg-black"
          src={video.url}
          controls
          playsInline
          preload="metadata"
          poster={video.thumbnailUrl}
          aria-label={`סרטון — ${title}`}
        />
      </div>
    </section>
  );
}
