import { PageMain } from "@/components/layout/PageMain";
import { ListingsFeed } from "./components/ListingsFeed";

export default function Home() {
  return (
    <PageMain flush>
      <ListingsFeed />
    </PageMain>
  );
}
