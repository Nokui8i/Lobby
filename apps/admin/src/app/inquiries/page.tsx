import styles from "./inquiriesChat.module.css";

export default function InquiriesIndexPage() {
  return (
    <div className={styles.placeholder}>
      <p style={{ margin: 0, fontWeight: 800, fontSize: 18, color: "#101820" }}>בחרו פנייה מהרשימה</p>
      <p style={{ margin: "8px 0 0", maxWidth: 320, lineHeight: 1.5 }}>
        כמו בצ׳אט — רשימה משמאל, שיחה מימין. כרטיס פתיחה מופיע בתחילת כל שיחה.
      </p>
    </div>
  );
}
