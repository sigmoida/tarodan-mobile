import { logger, safeError } from '@/services/logger';
import { View, ScrollView, RefreshControl } from 'react-native';
import { useState, useCallback, useEffect } from 'react';
import { theme } from '@/ui';
import { router } from 'expo-router';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { useGuestStore } from '@/stores/guestStore';
import { SignupPrompt } from '@/components/SignupPrompt';
import { AppShell } from '@/components/shell/AppShell';
import { goSearch } from './_lib/nav';
import { homeStyles as styles } from './_lib/homeStyles';
import { useHomeData } from './_hooks/useHomeData';
import { useHomeGuestPrompt } from './_hooks/useHomeGuestPrompt';
import { HomeSearch } from './_components/HomeSearch';
import { BrandsStrip } from './_components/HomeBrands';
import { FeaturedRail, OnSaleRail, TradeRail, PopularRail } from './_components/HomeRails';
import { TopCollections } from './_components/HomeCollections';
import { Spotlights } from './_components/HomeSpotlights';
import { HeroSection } from './_components/HeroSlider';
import { TrustBadges } from './_components/TrustBadges';
import { useHomeHero } from './_hooks/useHomeHero';
import { useHeroVisibility } from './_hooks/useHeroVisibility';
import { AdBanner } from '@/components/ads/AdBanner';
import { PopupAd } from '@/components/ads/PopupAd';
import { useAdSession } from '@/lib/ads/useAdSession';

const { colors } = theme;

/**
 * Ana sayfa — web ana sayfasının bölüm kümesi ve sırası (hero, markalar, Öne Çıkan, İndirimdekiler,
 * Takas Vitrini, Popüler, En İyi Koleksiyonlar, Haftanın Koleksiyoneri/Şirketi, güven rozetleri).
 * AppShell (marka barı + arama) içinde; her bölüm SectionCard + "Tümünü gör ›". Veri `useHomeData`.
 */
export default function HomeScreen() {
  const { isAuthenticated } = useAuthStore();
  const incrementListingView = useGuestStore((s) => s.incrementListingView);

  const data = useHomeData();
  const hero = useHomeHero();
  const heroView = useHeroVisibility();
  const guest = useHomeGuestPrompt(isAuthenticated);
  // Yuvalar (topbar/header/footer) aynı tohumu ve gösterim kümesini paylaşır.
  const adSession = useAdSession();

  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // API bağlantı kontrolü (yalnız log — davranış korunur).
  useEffect(() => {
    api
      .get('/health')
      .then(() => {
        logger.debug('API bağlantısı başarılı');
      })
      .catch((err) => {
        logger.debug('API bağlantısı yok, mock data kullanılacak', { err: safeError(err) });
      });
  }, []);

  const { refetchAll } = data;
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetchAll();
    setRefreshing(false);
  }, [refetchAll]);

  const handleProductPress = (productId: string) => {
    if (!isAuthenticated) incrementListingView();
    router.push(`/product/${productId}`);
  };

  return (
    <AppShell
      search={
        <HomeSearch value={searchQuery} onChange={setSearchQuery} onSearch={() => goSearch(searchQuery)} />
      }
    >
      <ScrollView
        style={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary[600]!]}
            tintColor={colors.primary[600]!}
          />
        }
        showsVerticalScrollIndicator={false}
        onScroll={heroView.onScroll}
        onLayout={heroView.onViewportLayout}
        scrollEventThrottle={64}
      >
        <AdBanner position="topbar" session={adSession} />
        <AdBanner position="header" session={adSession} />
        <View onLayout={heroView.onHeroLayout}>
          <HeroSection
            slides={hero.slides}
            locale={hero.locale}
            isLoading={hero.loadingSlides}
            visible={heroView.visible}
          />
        </View>

        <View style={styles.sections}>
          <BrandsStrip items={data.manufacturers} />
          <FeaturedRail items={data.featured} isLoading={data.loadingFeatured} onProductPress={handleProductPress} />
          <OnSaleRail items={data.onSale} isLoading={data.loadingOnSale} onProductPress={handleProductPress} />
          <TradeRail items={data.trade} isLoading={data.loadingTrade} onProductPress={handleProductPress} />
          <PopularRail items={data.popular} isLoading={data.loadingPopular} onProductPress={handleProductPress} />
          <TopCollections items={data.topCollections} isLoading={data.loadingTopCollections} />
          <Spotlights collector={data.featuredCollector} business={data.featuredBusiness} />
        </View>

        <AdBanner position="footer" session={adSession} />
        <TrustBadges badges={hero.badges} />
        <View style={styles.bottomSpace} />
      </ScrollView>

      {/* Popup reklam: misafir kayıt istemi açıkken çıkmaz (iki Modal birden iOS'u dondurur). */}
      <PopupAd blocked={guest.showPrompt} />

      {guest.promptType && (
        <SignupPrompt visible={guest.showPrompt} onDismiss={guest.dismissPrompt} type={guest.promptType} />
      )}
    </AppShell>
  );
}
