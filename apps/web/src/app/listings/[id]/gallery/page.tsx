import { notFound } from "next/navigation";
import { fetchPublicActiveListingServer } from "@/lib/firebase/listingServer";
import { ListingGalleryPageClient } from "./ListingGalleryPageClient";

interface ListingGalleryPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ photo?: string }>;
}

export default async function ListingGalleryPage({ params, searchParams }: ListingGalleryPageProps) {
  const { id } = await params;
  const { photo } = await searchParams;
  const listing = await fetchPublicActiveListingServer(id);

  if (!listing) {
    notFound();
  }

  const initialPhotoIndex = photo ? Number.parseInt(photo, 10) : 0;

  return (
    <ListingGalleryPageClient
      listing={listing}
      initialPhotoIndex={Number.isFinite(initialPhotoIndex) ? initialPhotoIndex : 0}
    />
  );
}
