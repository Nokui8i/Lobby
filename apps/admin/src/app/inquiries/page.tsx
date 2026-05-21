import { ic } from "@/lib/admin-page-classes";
import { cn } from "@/lib/utils";

export default function InquiriesIndexPage() {
  return (
    <div className={ic.placeholder}>
      <p className="m-0 text-lg font-extrabold text-foreground">בחרו פנייה מהרשימה</p>
      <p className="mt-2 max-w-xs leading-relaxed">
        כמו בצ׳אט — רשימה משמאל, שיחה מימין. כרטיס פתיחה מופיע בתחילת כל שיחה.
      </p>
    </div>
  );
}
