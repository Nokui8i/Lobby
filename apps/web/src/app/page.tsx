import { Suspense } from "react";
import { PageMain } from "@/components/layout/PageMain";
import { ListingsFeed } from "./components/ListingsFeed";

export default function Home() {
  return (
    <PageMain flush>
      <Suspense fallback={null}>
        <ListingsFeed />
      </Suspense>
    </PageMain>
  );
}
