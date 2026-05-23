import type { Metadata } from "next";
import { AccountSettingsClient } from "./AccountSettingsClient";

export const metadata: Metadata = {
  title: "הגדרות חשבון | Lobby",
};

export default function AccountSettingsPage() {
  return <AccountSettingsClient />;
}
