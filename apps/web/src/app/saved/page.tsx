import { PageMain } from "@/components/layout/PageMain";
import { SavedListingsClient } from "./SavedListingsClient";

export const metadata = {
  title: "מודעות שאהבתי | Lobby",
};

export default function SavedListingsPage() {
  return (
    <PageMain flush>
      <SavedListingsClient />
    </PageMain>
  );
}
