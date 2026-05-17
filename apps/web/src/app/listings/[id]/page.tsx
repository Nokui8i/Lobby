import { ListingDetailClient } from "./ListingDetailClient";

interface ListingPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ListingPage({ params }: ListingPageProps) {
  const { id } = await params;

  return <ListingDetailClient listingId={id} />;
}
