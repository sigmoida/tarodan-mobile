import React from 'react';
import { ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { EmptyState, SectionCard, SectionCardAction, SkeletonCard } from '@/ui';
import { ProductCard, type ProductCardProduct } from '@/components/product';
import { useProductCardFavorites } from '@/hooks/useFavoriteToggle';
import { searchEntryHref } from '@/lib/navigation/searchHref';
import { homeStyles as styles } from '../_lib/homeStyles';

type RailProps = {
  items: ProductCardProduct[];
  isLoading?: boolean;
  /** The rail never loaded (first load failed): hide it rather than show its empty state. */
  failed?: boolean;
  onProductPress: (id: string) => void;
};

const SKELETON_COUNT = 3;
const RAIL_LIMIT = 12;

/**
 * Home product rail (web `HomeSection` + `ProductRail`): horizontally scrolling 160pt cards in a
 * SectionCard (accent-bar title + "See all"). A horizontal rail is the mobile platform pattern;
 * the card has no meta row, like web `HomeProductCard`. Skeleton while loading. An empty rail is
 * not drawn without an `emptyState`, nor when it `failed` (never loaded).
 */
function ProductRail({
  title,
  onSeeAll,
  items,
  isLoading,
  failed,
  onProductPress,
  emptyState,
  testID,
}: RailProps & {
  title: string;
  onSeeAll: () => void;
  emptyState?: React.ReactNode;
  testID: string;
}) {
  const favoriteProps = useProductCardFavorites();
  if (!isLoading && items.length === 0 && (!emptyState || failed)) return null;
  return (
    <SectionCard title={title} action={<SectionCardAction onPress={onSeeAll} />} testID={testID}>
      {isLoading ? (
        <ScrollView horizontal scrollEnabled={false} style={styles.railScroll} contentContainerStyle={styles.rail} testID={`${testID}-skeleton`}>
          {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
            <View key={i} style={styles.railCell}>
              <SkeletonCard />
            </View>
          ))}
        </ScrollView>
      ) : items.length === 0 ? (
        emptyState
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.railScroll} contentContainerStyle={styles.rail}>
          {items.slice(0, RAIL_LIMIT).map((item) => (
            <View key={item.id} style={styles.railCell}>
              <ProductCard
                product={item}
                showMeta={false}
                onPress={() => onProductPress(item.id)}
                prefetchDetail
                {...favoriteProps(item)}
              />
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
      onSeeAll={() => router.push(searchEntryHref('all'))}
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
      onSeeAll={() => router.push(searchEntryHref('onSale'))}
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
      onSeeAll={() => router.push(searchEntryHref('tradeShowcase'))}
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
      onSeeAll={() => router.push(searchEntryHref('popular'))}
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
