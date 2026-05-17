import styles from "./chat.module.css";

export default function ChatIndexPlaceholder() {
  return (
    <div className={styles.chatPlaceholder}>
      <div className={styles.chatPlaceholderArt} aria-hidden />
      <p className={styles.chatPlaceholderTitle}>המשיכו מהיכן שהפסקתם</p>
      <p className={styles.chatPlaceholderHint}>בחרו שיחה מהרשימה כדי לפתוח את הצ׳אט סביב המודעה.</p>
    </div>
  );
}
