import styles from "./page.module.css";

export default function ListingLoading() {
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <div className={styles.loadingSkeleton} role="status" aria-label="טוען מודעה">
          <div className={styles.loadingSkeletonHero} />
          <div className={styles.loadingSkeletonLines}>
            <span />
            <span />
            <span className={styles.loadingSkeletonShort} />
          </div>
        </div>
      </div>
    </main>
  );
}
