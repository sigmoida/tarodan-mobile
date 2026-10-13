import React from 'react';
import { ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Badge, EmptyState, SectionCard, SectionCardAction, SkeletonCard } from '@/ui';
import { ProductCard, type ProductCardProduct } from '@/components/product';
import { homeStyles as styles } from '../_lib/homeStyles';

type RailProps = {
  items: ProductCardProduct[];
  isLoading?: boolean;
  onProductPress: (id: string) => void;
};

const SKELETON_COUNT = 3;
const RAIL_LIMIT = 12;

/**
 * Anasayfa ürün rayı (web `HomeSection` + `ProductRail`): SectionCard (vurgu çubuklu başlık +
 * "Tümünü gör ›") içinde yatay kayan 160pt kartlar. Mobilde yatay ray platform kalıbıdır; kart
 * web `HomeProductCard` gibi meta satırsız. Yüklenirken iskelet; `emptyState` yoksa boş ray çizilmez.
 */
function ProductRail({
  title,
  badge,
  onSeeAll,
  items,
  isLoading,
  onProductPress,
  emptyState,
  testID,
}: RailProps & {
  title: string;
  badge?: React.ReactNode;
  onSeeAll: () => void;
  emptyState?: React.ReactNode;
  testID: string;
}) {
  if (!isLoading && items.length === 0 && !emptyState) return null;
  return (
    <SectionCard title={title} badge={badge} action={<SectionCardAction onPress={onSeeAll} />} testID={testID}>
      {isLoading ? (
        <ScrollView horizontal scrollEnabled={false} contentContainerStyle={styles.rail} testID={`${testID}-skeleton`}>
          {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
            <View key={i} style={styles.railCell}>
              <SkeletonCard />
            </View>
          ))}
        </ScrollView>
      ) : items.length === 0 ? (
        emptyState
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
          {items.slice(0, RAIL_LIMIT).map((item) => (
            <View key={item.id} style={styles.railCell}>
              <ProductCard product={item} showMeta={false} onPress={() => onProductPress(item.id)} />
            </View>
          ))}
        </ScrollView>
      )}
    </SectionCard>
  );
}

export function FeaturedRail(props: RailProps) {
  const { t } = useTranslation();
  return (
    <ProductRail
      {...props}
      testID="home-featured"
      title={t('home.featuredRailTitle')}
      onSeeAll={() => router.push('/listings')}
    />
  );
}

export function OnSaleRail(props: RailProps) {
  const { t } = useTranslation();
  return (
    <ProductRail
      {...props}
      testID="home-on-sale"
      title={t('product.onSale')}
      badge={
        <Badge variant="danger" size="sm">
          {t('home.deals')}
        </Badge>
      }
      onSeeAll={() => router.push('/listings?discountOnly=true')}
    />
  );
}

export function TradeRail(props: RailProps) {
  const { t } = useTranslation();
  return (
    <ProductRail
      {...props}
      testID="home-trade"
      title={t('nav.tradeShowcase')}
      onSeeAll={() => router.push('/listings?tradeOnly=true')}
    />
  );
}

export function PopularRail(props: RailProps) {
  const { t } = useTranslation();
  return (
    <ProductRail
      {...props}
      testID="home-popular"
      title={t('home.popularListings')}
      onSeeAll={() => router.push('/listings?sortBy=view_count_desc')}
      emptyState={
        <EmptyState placement="inline"
          icon="tag"
          title={t('product.noListings')}
          subtitle={t('home.beTheFirst')}
          actionLabel={t('product.createListing')}
          onAction={() => router.push('/(tabs)/sell')}
        />
      }
    />
  );
}
