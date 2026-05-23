import { redirect } from "next/navigation";
import { accountMessagesIndexPath } from "@lobby/shared";

/** הפניה מנתיב ישן — כפתור ההדר והקישורים הישנים */
export default function ChatLegacyIndexRedirect() {
  redirect(accountMessagesIndexPath());
}
