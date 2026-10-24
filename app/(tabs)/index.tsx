import { View, RefreshControl } from 'react-native';
import Animated from 'react-native-reanimated';
import { useState, useCallback, useEffect, useMemo } from 'react';
import { theme, usePageGutter, usePageOffsetHandler, usePageScrollValue } from '@/ui';
import { router } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { useGuestStore } from '@/stores/guestStore';
import { SignupPrompt } from '@/components/SignupPrompt';
import { AppShell } from '@/components/shell/AppShell';
import { useTabBarInset } from '@/components/shell/tabBarLayout';
import { floatingBarScrollProps, useFloatingBarInset } from '@/components/shell/floatingBar';
import { homeStyles as styles } from './_lib/homeStyles';
import { useHomeData } from './_hooks/useHomeData';
import { useHomeGuestPrompt } from './_hooks/useHomeGuestPrompt';
import { useAfterFirstFrame } from './_hooks/useAfterFirstFrame';
import { BrandsStrip } from './_components/HomeBrands';
import { FeaturedRail, OnSaleRail, TradeRail, PopularRail } from './_components/HomeRails';
import { TopCollections } from './_components/HomeCollections';
import { Spotlights } from './_components/HomeSpotlights';
import { HeroSection } from './_components/HeroSlider';
import { HeroReserved } from './_components/HeroReserved';
import { useHomeHero } from './_hooks/useHomeHero';
import { useHeroVisibility } from './_hooks/useHeroVisibility';
import { AdBanner } from '@/components/ads/AdBanner';
import { PopupAd } from '@/components/ads/PopupAd';
import { useAdSession } from '@/lib/ads/useAdSession';

const { colors } = theme;

/**
 * Ana sayfa — web ana sayfasının bölüm kümesi ve sırası (hero, markalar, Öne Çıkan, İndirimdekiler,
 * Takas Vitrini, Popüler, En İyi Koleksiyonlar, Haftanın Koleksiyoneri/Şirketi). Güven rozeti ızgarası yok.
 * AppShell (marka barı: arama alanı + bildirim + sepet) içinde; her bölüm SectionCard + "Tümünü gör ›". Veri `useHomeData`.
 * Algılanan hız: ilk kare yalnız üst bölümleri (hero, markalar, Öne Çıkan, İndirimdekiler) çizer; alt
 * bölümler (Takas, Popüler, Koleksiyonlar, Haftanın…) ilk kareden sonra bağlanır, o ana dek iskelet.
 */
export default function HomeScreen() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const incrementListingView = useGuestStore((s) => s.incrementListingView);

  const data = useHomeData();
  const hero = useHomeHero();
  const heroView = useHeroVisibility();
  const showHero = !hero.loadingSlides && hero.slides.length > 0;
  // Sarmalayıcı kalkınca ölçüm sıfırlanır (visible eski değerde donmasın).
  const { resetHero } = heroView;
  useEffect(() => {
    if (!showHero) resetHero();
  }, [showHero, resetHero]);
  // Hero görünürlüğü (ofset UI thread'inden seyrek köprülenir) + üst barın kaydırma kenarı
  // (`page.scrollY`) — TEK handler.
  const page = usePageScrollValue();
  const onPageScroll = usePageOffsetHandler(page.scrollY, heroView.onScrollOffset);
  const guest = useHomeGuestPrompt(isAuthenticated);
  // Yuvalar (topbar/header/footer) aynı tohumu ve gösterim kümesini paylaşır.
  const adSession = useAdSession();
  // Large screens: the sections and ad slots take the tablet gutter, like the hero and the top bar.
  const gutter = usePageGutter();
  const sideGutter = useMemo(() => ({ paddingHorizontal: gutter }), [gutter]);

  const [refreshing, setRefreshing] = useState(false);
  const tabInset = useTabBarInset();
  // Üst bar içeriğin üstünde yüzer: liste bar yüksekliği kadar boşlukla başlar (iOS contentInset / Android padding).
  const barInset = useFloatingBarInset();
  // Alt bölümler ilk kareden sonra (ilk açılışta onlarca kart birden çizilmesin; sorgular zaten yolda).
  const lowerReady = useAfterFirstFrame();

  const { refetchAll } = data;
  const { refetch: refetchHero } = hero;
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchAll(), refetchHero()]);
    setRefreshing(false);
  }, [refetchAll, refetchHero]);

  const handleProductPress = (productId: string) => {
    if (!isAuthenticated) incrementListingView();
    router.push(`/product/${productId}`);
  };

  return (
    <AppShell scroll={page}>
      <Animated.ScrollView
        style={styles.scroll}
        {...floatingBarScrollProps(barInset)}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            progressViewOffset={barInset}
            colors={[colors.primary[600]!]}
            tintColor={colors.primary[600]!}
          />
        }
        showsVerticalScrollIndicator={false}
        onScroll={onPageScroll}
        onLayout={heroView.onViewportLayout}
        scrollEventThrottle={16}
      >
        <AdBanner position="topbar" session={adSession} />
        <AdBanner position="header" session={adSession} style={[styles.adHeader, sideGutter]} />
        {/* Hero yokken (boş liste) sarmalayıcı da yok: ilk bölüm üstteki reklam/üst barın altından
            tek `HOME_SECTION_GAP` ile (sections dolgusu) başlar. Yükleniyorsa yalnız son açılışta
            hero vardıysa yer tutulur (`reserveSpace`). */}
        {showHero ? (
          <View onLayout={heroView.onHeroLayout} testID="home-hero">
            <HeroSection slides={hero.slides} locale={hero.locale} visible={heroView.visible} />
          </View>
        ) : hero.reserveSpace ? (
          <HeroReserved />
        ) : null}

        <View style={[styles.sections, sideGutter]}>
          <BrandsStrip items={data.manufacturers} isLoading={data.loadingManufacturers} />
          <FeaturedRail items={data.featured} isLoading={data.loadingFeatured} onProductPress={handleProductPress} />
          <OnSaleRail items={data.onSale} isLoading={data.loadingOnSale} onProductPress={handleProductPress} />
          <TradeRail items={data.trade} isLoading={!lowerReady || data.loadingTrade} onProductPress={handleProductPress} />
          <PopularRail items={data.popular} isLoading={!lowerReady || data.loadingPopular} failed={data.failedPopular} onProductPress={handleProductPress} />
          <TopCollections items={data.topCollections} isLoading={!lowerReady || data.loadingTopCollections} />
          <Spotlights
            collector={data.featuredCollector}
            business={data.featuredBusiness}
            isLoading={!lowerReady || data.loadingSpotlights}
          />
        </View>

        <AdBanner position="footer" session={adSession} style={[styles.adFooter, sideGutter]} />
        <View style={{ height: tabInset }} />
      </Animated.ScrollView>

      {/* Popup reklam: misafir kayıt istemi açıkken çıkmaz (iki Modal birden iOS'u dondurur). */}
      <PopupAd blocked={guest.showPrompt} />

      {guest.promptType && (
        <SignupPrompt visible={guest.showPrompt} onDismiss={guest.dismissPrompt} type={guest.promptType} />
      )}
    </AppShell>
  );
}
