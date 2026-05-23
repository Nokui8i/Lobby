import { redirect } from "next/navigation";
import { accountMessagesIndexPath } from "@lobby/shared";

export default function SupportIndexRedirect() {
  redirect(accountMessagesIndexPath());
}
