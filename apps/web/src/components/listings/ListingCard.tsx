import Image from "next/image";
import Link from "next/link";
import {
  formatListingCardAddressLine,
  formatListingCardDistrictLine,
  formatListingCardPriceIls,
  formatListingCardRoomsLine,
  type RentalListing,
} from "@lobby/shared";
import { SaveListingButton } from "@/components/SaveListingButton";
import {
  LISTING_CARD_IMAGE_ASPECT_CLASS,
  LISTING_CARD_IMAGE_OBJECT_CLASS,
  LISTING_CARD_SURFACE_CLASS,
} from "@/components/listings/listingCardStyles";
import { cn } from "@/lib/utils";

export type ListingCardData = RentalListing & {
  listingId: string;
};

export function ListingCard({
  listing,
  className,
}: {
  listing: ListingCardData;
  className?: string;
}) {
  const addressLine = formatListingCardAddressLine(listing) || listing.title.trim();
  const districtLine = formatListingCardDistrictLine(listing);
  const roomsLine = formatListingCardRoomsLine(listing.rooms);
  const metaLine = [districtLine, roomsLine].filter(Boolean).join(" · ");
  const price = formatListingCardPriceIls(listing.priceIls);

  return (
    <Link href={`/listings/${listing.listingId}`} className={cn(LISTING_CARD_SURFACE_CLASS, className)}>
      <div className={cn("relative w-full overflow-hidden bg-slate-100", LISTING_CARD_IMAGE_ASPECT_CLASS)}>
        <Image
          src={listing.imageUrl}
          alt={addressLine || listing.title}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 280px"
          loading="lazy"
          className={cn(LISTING_CARD_IMAGE_OBJECT_CLASS, "transition duration-300 group-hover:scale-[1.015]")}
        />
        <SaveListingButton
          listingId={listing.listingId}
          listingTitle={listing.title}
          imageUrl={listing.imageUrl}
          priceIls={listing.priceIls}
          variant="card"
          className="absolute top-1.5 end-1.5 z-10"
        />
      </div>
      <div className="space-y-1 px-2 py-1.5 text-right">
        <p className="text-[16px] font-bold leading-none tracking-tight text-graphite" dir="ltr">
          <span className="me-0.5">{price.symbol}</span>
          <span className="tabular-nums">{price.amount}</span>
        </p>
        {addressLine ? (
          <p className="line-clamp-1 text-[13px] font-medium leading-snug text-graphite">{addressLine}</p>
        ) : null}
        {metaLine ? (
          <p className="line-clamp-1 text-[12px] leading-snug text-slate-500">{metaLine}</p>
        ) : null}
      </div>
    </Link>
  );
}
