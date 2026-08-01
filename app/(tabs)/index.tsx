import { View, ScrollView, RefreshControl } from 'react-native';
import { useState, useCallback, useEffect } from 'react';
import { theme } from '@/ui';
import { router } from 'expo-router';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { useGuestStore } from '@/stores/guestStore';
import { SignupPrompt } from '@/components/SignupPrompt';
import { goSearch } from './_lib/nav';
import { styles } from './_lib/styles';
import { useHomeData } from './_hooks/useHomeData';
import { useHomeBadges } from './_hooks/useHomeBadges';
import { useHomeGuestPrompt } from './_hooks/useHomeGuestPrompt';
import { HomeHeader } from './_components/HomeHeader';
import {
  HeroBanner,
  CategoriesSection,
  BrandsSection,
  ScalesSection,
  FeaturedCollectorSection,
  BoostedRail,
  PopularProducts,
  ProductsGrid,
  CollectionsSection,
} from './_components/HomeSections';
import { CompanyOfWeekSection } from './_components/CompanyOfWeekSection';
import { AdBanner } from '@/components/ads/AdBanner';

const { colors } = theme;

export default function HomeScreen() {
  const { isAuthenticated } = useAuthStore();
  const incrementListingView = useGuestStore((s) => s.incrementListingView);

  const {
    products,
    popularProducts,
    loadingPopular,
    boostedProducts,
    loadingBoosted,
    categories,
    loadingCategories,
    collections,
    loadingCollections,
    featuredCollector,
    loadingFeaturedCollector,
    companyOfWeek,
    loadingProducts,
    refetchProducts,
  } = useHomeData();
  const counts = useHomeBadges(isAuthenticated);
  const guest = useHomeGuestPrompt(isAuthenticated);

  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // API bağlantı kontrolü (yalnız log — davranış korunur).
  useEffect(() => {
    api
      .get('/health')
      .then(() => console.log('✅ API bağlantısı başarılı'))
      .catch((err) => console.log('⚠️ API bağlantısı yok, mock data kullanılacak:', err.message));
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetchProducts();
    setRefreshing(false);
  }, [refetchProducts]);

  const handleProductPress = (productId: string) => {
    if (!isAuthenticated) incrementListingView();
    router.push(`/product/${productId}`);
  };

  const cardProps = { cartProductIds: counts.cartProductIds, onProductPress: handleProductPress };

  return (
    <View style={[styles.container, { backgroundColor: colors.surface.DEFAULT }]}>
      <HomeHeader
        searchQuery={searchQuery}
        onChangeSearch={setSearchQuery}
        onSearch={() => goSearch(searchQuery)}
        counts={counts}
      />

      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary[600]!]} />}
        showsVerticalScrollIndicator={false}
      >
        <AdBanner />
        <HeroBanner />
        <CategoriesSection categories={categories} isLoading={loadingCategories} />
        <BrandsSection />
        <ScalesSection />
        <FeaturedCollectorSection featuredCollector={featuredCollector} isLoading={loadingFeaturedCollector} />
        <BoostedRail items={boostedProducts} isLoading={loadingBoosted} {...cardProps} />
        <PopularProducts items={popularProducts} isLoading={loadingPopular} {...cardProps} />
        <ProductsGrid items={products} isLoading={loadingProducts} {...cardProps} />
        <CompanyOfWeekSection companyOfWeek={companyOfWeek} />
        <CollectionsSection collections={collections} isLoading={loadingCollections} />
        <View style={{ height: 100 }} />
      </ScrollView>

      {guest.promptType && (
        <SignupPrompt visible={guest.showPrompt} onDismiss={guest.dismissPrompt} type={guest.promptType} />
      )}
    </View>
  );
}
