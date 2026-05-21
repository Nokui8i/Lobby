import {
  HOME_BANNER_AUTO_MS,
  LISTING_SIDEBAR_BANNER_ASPECT,
  isBannerLinkClickable,
  prepareCommercialBannerCarousel,
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
import { fetchActiveListingSidebarBanners } from '../lib/firebase/siteBanners';
import { isFirebaseConfigured } from '../lib/firebase/isConfigured';
import { appStyles } from '../styles/appStyles';

const HORIZONTAL_PAD = 20;
/** מעט קטן יותר מרוחב המסך הפחות padding */
const COMMERCIAL_BANNER_WIDTH_SCALE = 0.94;

function useSidebarBannerDimensions() {
  const { width: screenWidth } = useWindowDimensions();
  const cardWidth = Math.round((screenWidth - HORIZONTAL_PAD * 2) * COMMERCIAL_BANNER_WIDTH_SCALE);
  const cardHeight = Math.round(cardWidth / LISTING_SIDEBAR_BANNER_ASPECT);
  return { cardWidth, cardHeight };
}

function SidebarBannerSlide({
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

export function ListingSidebarBannersSection() {
  const { cardWidth, cardHeight } = useSidebarBannerDimensions();
  const [bundle, setBundle] = useState<{
    slides: HomeBannerSlide[];
    initialIndex: number;
    loadId: number;
  } | null>(null);

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      setBundle({ slides: [], initialIndex: 0, loadId: Date.now() });
      return;
    }
    let cancelled = false;
    void fetchActiveListingSidebarBanners()
      .then((rows) => {
        if (!cancelled) {
          const prepared = prepareCommercialBannerCarousel(rows);
          setBundle({ ...prepared, loadId: Date.now() });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setBundle({ slides: [], initialIndex: 0, loadId: Date.now() });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (bundle === null || bundle.slides.length === 0) {
    return null;
  }

  if (bundle.slides.length === 1) {
    return (
      <View style={{ paddingHorizontal: HORIZONTAL_PAD, marginTop: 12, alignItems: 'center' }}>
        <SidebarBannerSlide slide={bundle.slides[0]!} cardWidth={cardWidth} cardHeight={cardHeight} />
      </View>
    );
  }

  return (
    <ListingSidebarBannerCarousel
      key={bundle.loadId}
      slides={bundle.slides}
      initialIndex={bundle.initialIndex}
      cardWidth={cardWidth}
      cardHeight={cardHeight}
    />
  );
}

function ListingSidebarBannerCarousel({
  slides,
  initialIndex,
  cardWidth,
  cardHeight,
}: {
  slides: HomeBannerSlide[];
  initialIndex: number;
  cardWidth: number;
  cardHeight: number;
}) {
  const scrollRef = useRef<ScrollView>(null);
  const total = slides.length;
  const safeInitial = total <= 1 ? 0 : ((initialIndex % total) + total) % total;
  const [index, setIndex] = useState(safeInitial);

  useEffect(() => {
    const start = total <= 1 ? 0 : ((initialIndex % total) + total) % total;
    setIndex(start);
    scrollRef.current?.scrollTo({ x: start * cardWidth, animated: false });
  }, [initialIndex, total, cardWidth]);
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
      const next = (index + 1) % total;
      scrollRef.current?.scrollTo({ x: next * cardWidth, animated: true });
      setIndex(next);
    }, HOME_BANNER_AUTO_MS);
    return () => clearTimeout(t);
  }, [index, total, cardWidth]);

  return (
    <View style={{ alignItems: 'center', marginTop: 12 }}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScrollEnd}
        style={{ width: cardWidth }}
      >
        {slides.map((slide) => (
          <SidebarBannerSlide key={slide.id} slide={slide} cardWidth={cardWidth} cardHeight={cardHeight} />
        ))}
      </ScrollView>
    </View>
  );
}
