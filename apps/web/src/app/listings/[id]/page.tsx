import { fetchPublicActiveListingServer } from "@/lib/firebase/listingServer";
import { ListingDetailClient } from "./ListingDetailClient";

interface ListingPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ListingPage({ params }: ListingPageProps) {
  const { id } = await params;
  const initialListing = await fetchPublicActiveListingServer(id);

  return <ListingDetailClient listingId={id} initialListing={initialListing} />;
}
