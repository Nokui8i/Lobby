import {
  HOME_BANNER_ASPECT,
  HOME_BANNER_AUTO_MS,
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
import { fetchActiveHomeBanners } from '../lib/firebase/homeBanners';
import { isFirebaseConfigured } from '../lib/firebase/isConfigured';
import { appStyles } from '../styles/appStyles';

const HORIZONTAL_PAD = 20;

function useBannerDimensions() {
  const { width: screenWidth } = useWindowDimensions();
  const cardWidth = screenWidth - HORIZONTAL_PAD * 2;
  const cardHeight = Math.round(cardWidth / HOME_BANNER_ASPECT);
  return { cardWidth, cardHeight };
}

function BannerCarouselSkeleton({ cardWidth, cardHeight }: { cardWidth: number; cardHeight: number }) {
  return (
    <View style={[appStyles.bannerCarousel, { paddingHorizontal: HORIZONTAL_PAD }]}>
      <View
        style={[
          appStyles.bannerCard,
          {
            width: cardWidth,
            height: cardHeight,
            backgroundColor: '#E8F5FD',
          },
        ]}
      />
    </View>
  );
}

function BannerSlide({
  slide,
  cardWidth,
  cardHeight,
}: {
  slide: HomeBannerSlide;
  cardWidth: number;
  cardHeight: number;
}) {
  const openLink = () => {
    const trimmed = slide.linkUrl.trim();
    if (!trimmed || !/^https?:\/\//i.test(trimmed)) return;
    void Linking.openURL(trimmed);
  };

  const image = (
    <Image
      source={{ uri: slide.src }}
      accessibilityLabel={slide.alt}
      style={[appStyles.bannerCard, appStyles.bannerBackgroundImage, { width: cardWidth, height: cardHeight }]}
      resizeMode="contain"
    />
  );

  if (isBannerLinkClickable(slide.linkUrl)) {
    return (
      <Pressable accessibilityRole="link" onPress={openLink}>
        {image}
      </Pressable>
    );
  }
  return image;
}

/** באנר בודד — בלי גלילה וטיימר */
function HomeBannerStatic({
  slide,
  cardWidth,
  cardHeight,
}: {
  slide: HomeBannerSlide;
  cardWidth: number;
  cardHeight: number;
}) {
  return (
    <View style={[appStyles.bannerCarousel, { paddingHorizontal: HORIZONTAL_PAD }]}>
      <BannerSlide slide={slide} cardWidth={cardWidth} cardHeight={cardHeight} />
    </View>
  );
}

export function HomeBannersSection() {
  const { cardWidth, cardHeight } = useBannerDimensions();
  const [slides, setSlides] = useState<HomeBannerSlide[] | null>(null);

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      setSlides([]);
      return;
    }
    let cancelled = false;
    void fetchActiveHomeBanners()
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
    return <BannerCarouselSkeleton cardWidth={cardWidth} cardHeight={cardHeight} />;
  }

  if (slides.length === 0) return null;

  return <HomeBannerCarousel slides={slides} />;
}

function HomeBannerCarousel({ slides }: { slides: HomeBannerSlide[] }) {
  const { cardWidth, cardHeight } = useBannerDimensions();
  const total = slides.length;

  if (total === 0) return null;
  if (total === 1) {
    return <HomeBannerStatic slide={slides[0]!} cardWidth={cardWidth} cardHeight={cardHeight} />;
  }

  return <HomeBannerCarouselMulti slides={slides} cardWidth={cardWidth} cardHeight={cardHeight} />;
}

function HomeBannerCarouselMulti({
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
  const total = slides.length;

  const goTo = useCallback(
    (next: number) => {
      const i = ((next % total) + total) % total;
      setIndex(i);
      scrollRef.current?.scrollTo({ x: i * cardWidth, animated: true });
    },
    [cardWidth, total],
  );

  /** 10 שניות על כל באנר — הטיימר מתאפס אחרי כל מעבר */
  useEffect(() => {
    const t = setTimeout(() => {
      const next = (index + 1) % total;
      setIndex(next);
      scrollRef.current?.scrollTo({ x: next * cardWidth, animated: true });
    }, HOME_BANNER_AUTO_MS);
    return () => clearTimeout(t);
  }, [index, cardWidth, total]);

  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    const i = Math.round(x / cardWidth);
    if (i >= 0 && i < total) setIndex(i);
  };

  return (
    <View style={appStyles.bannerCarousel}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        scrollEnabled
        showsHorizontalScrollIndicator={false}
        decelerationRate="normal"
        snapToInterval={cardWidth}
        contentContainerStyle={{ paddingHorizontal: HORIZONTAL_PAD }}
        onMomentumScrollEnd={onScrollEnd}
      >
        {slides.map((slide) => (
          <View key={slide.id} style={{ width: cardWidth }}>
            <BannerSlide slide={slide} cardWidth={cardWidth} cardHeight={cardHeight} />
          </View>
        ))}
      </ScrollView>

      <View style={appStyles.bannerIndicators}>
        {slides.map((s, i) => (
          <Pressable
            key={s.id}
            accessibilityRole="button"
            accessibilityLabel={`באנר ${i + 1}`}
            onPress={() => goTo(i)}
            style={[appStyles.bannerIndicator, i === index && appStyles.bannerIndicatorActive]}
          />
        ))}
      </View>
    </View>
  );
}
