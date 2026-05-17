import { featureLabels, type RentalListing } from '@lobby/shared';
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
  return (
    <Pressable style={appStyles.card} onPress={onPress}>
      <View style={appStyles.imageWrap}>
        <Image source={{ uri: listing.imageUrl }} style={appStyles.cardImage} />
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
        <View style={appStyles.cardTop}>
          <Text style={appStyles.cardTitle}>{listing.title}</Text>
          <Text style={appStyles.cardPrice}>₪{listing.priceIls.toLocaleString('he-IL')}</Text>
        </View>
        <Text style={appStyles.cardMeta}>
          {[listing.streetLine?.trim(), listing.neighborhood?.trim(), listing.city]
            .filter(Boolean)
            .join(", ")}{" "}
          · {listing.rooms} חד׳ · {listing.sizeSqm} מ״ר
        </Text>
        <View style={appStyles.featureRow}>
          {listing.features.slice(0, 3).map((feature) => (
            <Text key={feature} style={appStyles.featurePill}>
              {featureLabels[feature]}
            </Text>
          ))}
        </View>
      </View>
    </Pressable>
  );
}
