import styles from "./loading.module.css";

export default function RootLoading() {
  return (
    <div className={styles.wrap} role="status" aria-live="polite" aria-label="טוען">
      <div className={styles.bar} />
    </div>
  );
}
