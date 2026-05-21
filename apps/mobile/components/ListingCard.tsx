import {
  formatListingCardAddressLine,
  formatListingCardDistrictLine,
  formatListingCardPriceIls,
  formatListingCardRoomsLine,
  type RentalListing,
} from '@lobby/shared';
import { Image, Pressable, Text, View } from 'react-native';
import { SaveListingButton } from './SaveListingButton';
import { appStyles } from '../styles/appStyles';

export function ListingCard({
  listing,
  onPress,
}: {
  listing: RentalListing;
  onPress: () => void;
}) {
  const addressLine = formatListingCardAddressLine(listing) || listing.title.trim();
  const districtLine = formatListingCardDistrictLine(listing);
  const roomsLine = formatListingCardRoomsLine(listing.rooms);
  const metaLine = [districtLine, roomsLine].filter(Boolean).join(' · ');
  const price = formatListingCardPriceIls(listing.priceIls);

  return (
    <Pressable style={appStyles.card} onPress={onPress}>
      <View style={appStyles.imageWrap}>
        <Image source={{ uri: listing.imageUrl }} style={appStyles.cardImage} resizeMode="cover" />
        <SaveListingButton
          listingId={listing.id}
          listingTitle={listing.title}
          imageUrl={listing.imageUrl}
          priceIls={listing.priceIls}
          variant="card"
          style={appStyles.cardSaveBtn}
        />
      </View>
      <View style={appStyles.cardBody}>
        <Text style={appStyles.cardPrice}>
          {price.symbol} {price.amount}
        </Text>
        {addressLine ? (
          <Text style={appStyles.cardAddress} numberOfLines={1}>
            {addressLine}
          </Text>
        ) : null}
        {metaLine ? (
          <Text style={appStyles.cardMeta} numberOfLines={1}>
            {metaLine}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}
