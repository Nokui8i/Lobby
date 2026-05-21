import {
  HOME_BANNER_AUTO_MS,
  LISTING_BANNER_ASPECT,
  isBannerLinkClickable,
  type HomeBannerSlide,
} from '@lobby/shared';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Image,
  Linking,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  View,
  useWindowDimensions,
} from 'react-native';
import { fetchActiveListingBanners } from '../lib/firebase/siteBanners';
import { isFirebaseConfigured } from '../lib/firebase/isConfigured';
import { appStyles } from '../styles/appStyles';

const HORIZONTAL_PAD = 20;
const MAX_BANNER_WIDTH = 400;

function useListingBannerDimensions() {
  const { width: screenWidth } = useWindowDimensions();
  const cardWidth = Math.min(screenWidth - HORIZONTAL_PAD * 2, MAX_BANNER_WIDTH);
  const cardHeight = Math.round(cardWidth / LISTING_BANNER_ASPECT);
  return { cardWidth, cardHeight };
}

function ListingBannerSlide({
  slide,
  cardWidth,
  cardHeight,
}: {
  slide: HomeBannerSlide;
  cardWidth: number;
  cardHeight: number;
}) {
  const content = (
    <Image
      source={{ uri: slide.src }}
      style={{ width: cardWidth, height: cardHeight }}
      resizeMode="contain"
      accessibilityLabel={slide.alt}
    />
  );

  if (!isBannerLinkClickable(slide.linkUrl)) {
    return (
      <View style={[appStyles.bannerCard, { width: cardWidth, height: cardHeight, overflow: 'hidden' }]}>
        {content}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={slide.alt}
      onPress={() => {
        const href = slide.linkUrl.trim();
        if (/^https?:\/\//i.test(href)) {
          void Linking.openURL(href);
        }
      }}
      style={[appStyles.bannerCard, { width: cardWidth, height: cardHeight, overflow: 'hidden' }]}
    >
      {content}
    </Pressable>
  );
}

export function ListingBannersSection() {
  const { cardWidth, cardHeight } = useListingBannerDimensions();
  const [slides, setSlides] = useState<HomeBannerSlide[] | null>(null);

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      setSlides([]);
      return;
    }
    let cancelled = false;
    void fetchActiveListingBanners()
      .then((rows) => {
        if (!cancelled) setSlides(rows);
      })
      .catch(() => {
        if (!cancelled) setSlides([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (slides === null) {
    return (
      <View style={{ alignItems: 'center', marginTop: 16 }}>
        <View
          style={[
            appStyles.bannerCard,
            { width: cardWidth, height: cardHeight, backgroundColor: '#E8F5FD' },
          ]}
        />
      </View>
    );
  }

  if (slides.length === 0) return null;

  if (slides.length === 1) {
    return (
      <View style={{ alignItems: 'center', marginTop: 16 }}>
        <ListingBannerSlide slide={slides[0]!} cardWidth={cardWidth} cardHeight={cardHeight} />
      </View>
    );
  }

  return (
    <ListingBannerCarouselMulti slides={slides} cardWidth={cardWidth} cardHeight={cardHeight} />
  );
}

function ListingBannerCarouselMulti({
  slides,
  cardWidth,
  cardHeight,
}: {
  slides: HomeBannerSlide[];
  cardWidth: number;
  cardHeight: number;
}) {
  const scrollRef = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);

  const onScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const x = e.nativeEvent.contentOffset.x;
      const next = Math.round(x / cardWidth);
      setIndex(next);
    },
    [cardWidth],
  );

  useEffect(() => {
    const t = setTimeout(() => {
      const next = (index + 1) % slides.length;
      scrollRef.current?.scrollTo({ x: next * cardWidth, animated: true });
      setIndex(next);
    }, HOME_BANNER_AUTO_MS);
    return () => clearTimeout(t);
  }, [index, slides.length, cardWidth]);

  return (
    <View style={{ alignItems: 'center', marginTop: 16 }}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScrollEnd}
        style={{ width: cardWidth }}
      >
        {slides.map((slide) => (
          <ListingBannerSlide key={slide.id} slide={slide} cardWidth={cardWidth} cardHeight={cardHeight} />
        ))}
      </ScrollView>
      <View style={appStyles.bannerIndicators}>
        {slides.map((s, i) => (
          <View
            key={s.id}
            style={[appStyles.bannerIndicator, i === index && appStyles.bannerIndicatorActive]}
          />
        ))}
      </View>
    </View>
  );
}
