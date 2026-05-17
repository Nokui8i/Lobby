"use client";

import type { ListingVideo } from "@lobby/shared";
import styles from "./ListingVideoPlayer.module.css";

export function ListingVideoPlayer({ video, title }: { video: ListingVideo; title: string }) {
  if (!video.url) {
    return null;
  }

  return (
    <section className={styles.section} aria-label="סרטון המודעה">
      <div className={styles.header}>
        <span className={styles.badge}>סרטון</span>
        {video.durationSeconds > 0 ? (
          <span className={styles.duration}>{video.durationSeconds} שנ׳</span>
        ) : null}
      </div>
      <div className={styles.frame}>
        <video
          className={styles.video}
          src={video.url}
          controls
          playsInline
          preload="metadata"
          aria-label={`סרטון — ${title}`}
        />
      </div>
    </section>
  );
}
