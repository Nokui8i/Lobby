import type { Metadata } from "next";
import { Suspense } from "react";
import { PublishListingClient } from "./PublishListingClient";

export const metadata: Metadata = {
  title: "פרסום דירה | Lobby",
  description: "פרסמו דירה להשכרה בלובי — ללא דמי תיווך לשוכרים.",
};

export default function PublishPage() {
  return (
    <Suspense fallback={<p style={{ padding: 24, textAlign: "right" }}>טוען…</p>}>
      <PublishListingClient />
    </Suspense>
  );
}
