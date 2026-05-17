import type { Metadata } from "next";
import { NotificationsClient } from "./NotificationsClient";

export const metadata: Metadata = {
  title: "התראות | Lobby",
};

export default function NotificationsPage() {
  return <NotificationsClient />;
}
