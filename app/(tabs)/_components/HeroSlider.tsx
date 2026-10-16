import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, ScrollView, type LayoutChangeEvent, type NativeSyntheticEvent, type NativeScrollEvent } from 'react-native';
import { Image } from 'expo-image';
import { Button, Text } from '@/ui';
import { heroApi, type HeroSlide } from '@/lib/api';
import { openAdLink } from '@/lib/ads/openAdLink';
import { useAdImpression } from '@/lib/ads/useAdImpression';
import { useScreenActive } from '@/lib/ads/useScreenActive';
import { heroImageUrl, pickLocalized, resolveHeroCta } from '@/lib/hero/heroView';
import { heroStyles as s } from '../_lib/heroStyles';

const AUTOPLAY_MS = 10_000;

// Memoize: sürükleme/ilerleme state'i değişince yalnız `isCurrent`/`visible` değişen
// slayt yeniden çizilir (props'lar ilkel ya da `select` ile kararlı referans).
const HeroSlideItem = React.memo(function HeroSlideItem({
  slide,
  locale,
  width,
  isCurrent,
  visible,
}: {
  slide: HeroSlide;
  locale: string;
  width: number;
  isCurrent: boolean;
  /** Hero görünür alanda mı (sayfa kaydırılıp uzaklaşınca gösterim sayılmaz). */
  visible: boolean;
}) {
  // Görsel yüklenmeden gösterim sayılmaz (AdBanner ile aynı kural): kullanıcı henüz
  // boş bir kutu görüyor.
  const [loaded, setLoaded] = useState(false);
  // Gösterim: slayt gerçekten ekranda (geçerli sayfa + hero görünür + görsel yüklü + odakta
  // + uygulama önde) ~1 sn kalınca, slayt başına bir kez.
  useAdImpression(slide.id, isCurrent && visible && loaded, heroApi.recordImpression);

  const title = pickLocalized(slide.title, locale);
  const subtitle = pickLocalized(slide.subtitle, locale);
  const alt = pickLocalized(slide.imageAlt, locale) || title;
  const ctas = [
    { index: 1 as const, cta: resolveHeroCta(slide.cta1, locale) },
    { index: 2 as const, cta: resolveHeroCta(slide.cta2, locale) },
  ];

  return (
    <View style={{ width }} testID={`hero-slide-${slide.id}`}>
      {/* Telefonda görsel her zaman üstte, metin altta (`imageSide` yalnız tablet yatay için). */}
      <Image
        source={{ uri: heroImageUrl(slide) }}
        style={s.image}
        contentFit="cover"
        transition={200}
        accessibilityLabel={alt}
        testID={`hero-image-${slide.id}`}
        onLoad={() => setLoaded(true)}
      />
      <View style={s.body}>
        <Text variant="h2" tone="heading" accessibilityRole="header" style={s.title}>
          {title}
        </Text>
        {!!subtitle && (
          <Text variant="body" tone="muted">
            {subtitle}
          </Text>
        )}
        <View style={s.buttons}>
          {ctas.map(({ index, cta }) =>
            cta ? (
              <Button
                key={index}
                variant={index === 1 ? 'primary' : 'outline'}
                fullWidth
                title={cta.label}
                testID={`hero-cta-${slide.id}-${index}`}
                onPress={() => {
                  // Tek istek: sunucu slayt toplamını ve buton sayacını birlikte artırır.
                  heroApi.recordClick(slide.id, index).catch(() => {});
                  openAdLink(cta.href);
                }}
              />
            ) : null,
          )}
        </View>
      </View>
    </View>
  );
});

/** Admin'in tanımladığı ana sayfa slayt şeridi (yatay sayfalama + otomatik ilerleme). */
export function HeroSlider({
  slides,
  locale,
  visible = true,
}: {
  slides: HeroSlide[];
  locale: string;
  /** Hero görünür alanda mı; değilse otomatik ilerleme durur, gösterim sayılmaz. */
  visible?: boolean;
}) {
  // Sekme odakta değilken ya da uygulama arka plandayken de ilerleme durur.
  const screenActive = useScreenActive();
  const autoplay = screenActive && visible;
  const [width, setWidth] = useState(0);
  const [current, setCurrent] = useState(0);
  // Parmak ekrandayken otomatik ilerleme durur (kullanıcının elinden sayfa kaçmasın).
  const [dragging, setDragging] = useState(false);
  const scroller = useRef<ScrollView>(null);
  const count = slides.length;
  // Liste kısalırsa (ör. bir slayt süzülür/süresi dolar) `current` geçerli aralığa çekilir.
  const index = Math.min(current, Math.max(0, count - 1));
  const indexRef = useRef(index);
  indexRef.current = index;

  // Gerçek (yuvarlanmamış) görünüm genişliği — `pagingEnabled` sayfayı bu genişlikle
  // böler; yuvarlama her sayfada birikerek kaymaya yol açar. Ölçüm kenarlığı olan
  // kabuktan değil, ScrollView'in kendisinden alınır (sayfa = görünür alan).
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  const goTo = useCallback(
    (i: number) => {
      const next = (i + count) % count;
      setCurrent(next);
      scroller.current?.scrollTo({ x: next * width, animated: true });
    },
    [count, width],
  );

  // Slayt sayısı ya da genişlik değişince state'i sınırla ve kaydırma konumunu
  // geçerli sayfaya yeniden oturt (aksi halde ScrollView eski ofsette kalır).
  useEffect(() => {
    if (indexRef.current !== current) setCurrent(indexRef.current);
    if (width) scroller.current?.scrollTo({ x: indexRef.current * width, animated: false });
    // `current` bilerek yok: kullanıcı kaydırmasını geri sarmamalı.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, width]);

  // Otomatik ilerleme — her sayfa değişiminde (elle de olsa) süre yeniden başlar.
  useEffect(() => {
    if (count < 2 || !width || dragging || !autoplay) return;
    const id = setTimeout(() => goTo(index + 1), AUTOPLAY_MS);
    return () => clearTimeout(id);
  }, [count, width, index, goTo, dragging, autoplay]);

  const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setDragging(false);
    if (!width) return;
    setCurrent(Math.min(count - 1, Math.max(0, Math.round(e.nativeEvent.contentOffset.x / width))));
  };

  return (
    <View style={s.shell} testID="hero-slider">
      {/* ScrollView her zaman bağlı: genişlik ancak kendi yerleşiminden öğrenilir. */}
      <ScrollView
        ref={scroller}
        onLayout={onLayout}
        testID="hero-scroller"
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScrollBeginDrag={() => setDragging(true)}
        // Momentum olmadan biten sürüklemede `onMomentumScrollEnd` gelmeyebilir: burada da devam et.
        onScrollEndDrag={() => setDragging(false)}
        onMomentumScrollEnd={onMomentumEnd}
      >
        {width > 0 &&
          slides.map((slide, i) => (
            <HeroSlideItem
              key={slide.id}
              slide={slide}
              locale={locale}
              width={width}
              isCurrent={i === index}
              visible={visible}
            />
          ))}
      </ScrollView>
      {/* Şerit tek slaytta da yer tutar: yükseklik slayt sayısından bağımsız kalsın. */}
      <View style={s.dots}>
        {count > 1 &&
          slides.map((slide, i) => <View key={slide.id} style={[s.dot, i === index && s.dotActive]} />)}
      </View>
    </View>
  );
}

/**
 * Ana sayfa hero'su. Çizim kararı (yükleniyor / yer tut / göster) ekranda
 * (`app/(tabs)/index.tsx`) verilir; burada yalnız slayt yoksa `null` (güvenlik).
 */
export function HeroSection({
  slides,
  locale,
  visible,
}: {
  slides: HeroSlide[];
  locale: string;
  visible?: boolean;
}) {
  if (slides.length === 0) return null;
  return <HeroSlider slides={slides} locale={locale} visible={visible} />;
}
