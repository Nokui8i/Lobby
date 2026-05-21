import { Pressable, Text, View } from 'react-native';
import { HomeBannersSection } from './HomeBannerCarousel';
import { appStyles } from '../styles/appStyles';

/** ראש דף הבית: קרוסלת באנרים (מנוהל באדמין) + חיפוש */
export function HomeFeedHero({
  searchSummary,
  hasActiveFilters,
  onOpenSearch,
}: {
  searchSummary: string;
  hasActiveFilters: boolean;
  onOpenSearch: () => void;
}) {
  return (
    <View style={appStyles.heroSection}>
      <HomeBannersSection />

      <Pressable
        style={appStyles.heroSearchBubble}
        accessibilityRole="button"
        accessibilityLabel="חיפוש וסינון"
        onPress={onOpenSearch}
      >
        <Text style={appStyles.heroSearchLabel}>איפה מחפשים?</Text>
        <Text style={appStyles.heroSearchValue} numberOfLines={2}>
          {hasActiveFilters ? searchSummary || 'סינון פעיל' : 'עיר או רחוב'}
        </Text>
        {hasActiveFilters ? (
          <Text style={appStyles.heroSearchHint}>לחצו לעריכה · חיפוש מחדש</Text>
        ) : null}
        <Text style={appStyles.heroSearchIcon}>⌕</Text>
      </Pressable>
    </View>
  );
}
