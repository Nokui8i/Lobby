import type { Metadata } from "next";
import { AccountAreaClient } from "./AccountAreaClient";

export const metadata: Metadata = {
  title: "אזור אישי | Lobby",
  description: "המודעות שלך בלובי.",
};

export default function AccountPage() {
  return <AccountAreaClient />;
}
