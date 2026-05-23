import Link from "next/link";
import { ListingCardImage } from "@/components/listings/ListingCardImage";
import {
  formatListingCardAddressLine,
  formatListingCardDistrictLine,
  formatListingCardPriceIls,
  formatListingCardRoomsLine,
  type RentalListing,
} from "@lobby/shared";
import { SaveListingButton } from "@/components/SaveListingButton";
import {
  LISTING_CARD_FEATURED_IMAGE_ASPECT_CLASS,
  LISTING_CARD_IMAGE_ASPECT_CLASS,
  LISTING_CARD_SURFACE_CLASS,
} from "@/components/listings/listingCardStyles";
import { cn } from "@/lib/utils";

export type ListingCardData = RentalListing & {
  listingId: string;
};

export type ListingCardSize = "default" | "featured";

export function ListingCard({
  listing,
  className,
  size = "default",
}: {
  listing: ListingCardData;
  className?: string;
  size?: ListingCardSize;
}) {
  const featured = size === "featured";
  const addressLine = formatListingCardAddressLine(listing) || listing.title.trim();
  const districtLine = formatListingCardDistrictLine(listing);
  const roomsLine = formatListingCardRoomsLine(listing.rooms);
  const metaLine = [districtLine, roomsLine].filter(Boolean).join(" · ");
  const price = formatListingCardPriceIls(listing.priceIls);

  return (
    <Link
      href={`/listings/${listing.listingId}`}
      className={cn(
        LISTING_CARD_SURFACE_CLASS,
        featured && "rounded-[14px] shadow-bubble sm:rounded-[16px]",
        className,
      )}
    >
      <div
        className={cn(
          "relative w-full overflow-hidden bg-slate-100",
          featured ? LISTING_CARD_FEATURED_IMAGE_ASPECT_CLASS : LISTING_CARD_IMAGE_ASPECT_CLASS,
        )}
      >
        <ListingCardImage
          src={listing.imageUrl}
          alt={addressLine || listing.title}
          featured={featured}
          sizes={
            featured
              ? "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 520px"
              : "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 280px"
          }
        />
        <SaveListingButton
          listingId={listing.listingId}
          listingTitle={listing.title}
          imageUrl={listing.imageUrl}
          priceIls={listing.priceIls}
          variant="card"
          className={cn("absolute z-10", featured ? "top-2 end-2" : "top-1.5 end-1.5")}
        />
      </div>
      <div className={cn("space-y-1 text-right", featured ? "px-3 py-2 sm:px-3.5 sm:py-2.5" : "px-2 py-1.5")}>
        <p
          className={cn(
            "font-bold leading-none tracking-tight text-graphite",
            featured ? "text-[18px] sm:text-[20px]" : "text-[16px]",
          )}
          dir="ltr"
        >
          <span className="me-0.5">{price.symbol}</span>
          <span className="tabular-nums">{price.amount}</span>
        </p>
        {addressLine ? (
          <p
            className={cn(
              "line-clamp-1 font-medium leading-snug text-graphite",
              featured ? "text-[14px] sm:text-[15px]" : "text-[13px]",
            )}
          >
            {addressLine}
          </p>
        ) : null}
        {metaLine ? (
          <p
            className={cn(
              "line-clamp-1 leading-snug text-slate-500",
              featured ? "text-[13px]" : "text-[12px]",
            )}
          >
            {metaLine}
          </p>
        ) : null}
      </div>
    </Link>
  );
}
