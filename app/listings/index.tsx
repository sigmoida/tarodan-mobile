import { useMemo } from 'react';
import { View, RefreshControl } from 'react-native';
import Animated from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { PageShell } from '@/components/common/PageShell';
import { pageListContentStyle, theme, usePageScrollHandler } from '@/ui';
import ProductFilterSheet from '@/components/ProductFilterSheet';
import {
  ProductCard,
  ProductGridSkeleton,
  ProductListEmpty,
  ProductSortModal,
  useProductCellWidth,
} from '@/components/product';
import { AdBanner } from '@/components/ads/AdBanner';
import { withInlineAds, type GridRow } from '@/lib/ads/inlinePlacement';
import { useAdSession } from '@/lib/ads/useAdSession';
import { useListings } from './_hooks/useListings';
import { styles } from './_lib/styles';
import { ListingsHeader } from './_components/ListingsHeader';
import { ListingsFooter } from './_components/ListingsFooter';

const { colors } = theme;

/**
 * Tüm ilanlar — web `/listings`: PageShell (başlık üst barda) + ortak `ProductListToolbar` (arama,
 * filtre + sıralama + ızgara/liste, ürün sayısı, aktif filtre çipleri) ve ürün ızgarası. Kontrolcü
 * `useListings`; ekran yalnız kompozisyon.
 */
export default function ListingsScreen() {
  const { t } = useTranslation();
  const f = useListings();
  // Izgara içi (inline) reklam: 8. karttan sonra, sonra 16'da bir, en çok 2 (web ile aynı).
  // 2 sütunlu ızgara satırlara bölünür; afiş tam genişlikte kendi satırında durur.
  const adSession = useAdSession();
  const isList = f.layout === 'list';
  const rows = useMemo(() => withInlineAds(f.listings, isList ? 1 : 2), [f.listings, isList]);
  const cellWidth = useProductCellWidth();
  const page = usePageScrollHandler();

  return (
    <PageShell
      title={t('common.listings')}
      mode="list"
      scroll={page}
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
      overlay={
        <>
          <ProductSortModal
            visible={f.sortMenuVisible}
            value={f.filters.sortBy}
            onSelect={(sortBy) => {
              f.setFilters({ ...f.filters, sortBy });
              f.setSortMenuVisible(false);
            }}
            onClose={() => f.setSortMenuVisible(false)}
          />
          <ProductFilterSheet
            visible={f.filterModalVisible}
            onClose={() => f.setFilterModalVisible(false)}
            filters={f.filters}
            onChange={f.setFilters}
            onClear={f.clearFilters}
            options={f.options}
            resultCount={f.total}
            countLoading={f.isFetching && !f.isFetchingNextPage}
          />
        </>
      }
    >
      <Animated.FlatList
        {...page.listProps}
        data={f.isLoading ? [] : rows}
        keyExtractor={(row) => row.key}
        renderItem={({ item: row }: { item: GridRow<any> }) =>
          row.kind === 'ad' ? (
            <AdBanner position="inline" slotKey={`inline-${row.slot}`} session={adSession} />
          ) : (
            <View style={styles.row}>
              {row.items.map((item, i) => (
                <View key={`${item.id}-${i}`} style={{ width: isList ? '100%' : cellWidth }}>
                  <ProductCard product={item} layout={isList ? 'list' : 'grid'} />
                </View>
              ))}
            </View>
          )
        }
        contentContainerStyle={page.contentStyle([pageListContentStyle, styles.content])}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={f.isRefetching}
            onRefresh={f.refetch}
            progressViewOffset={page.topInset}
            colors={[colors.primary[600]!]}
            tintColor={colors.primary[600]!}
          />
        }
        onEndReached={() => {
          if (f.hasNextPage && !f.isFetchingNextPage) f.fetchNextPage();
        }}
        onEndReachedThreshold={0.5}
        ListHeaderComponent={<ListingsHeader f={f} session={adSession} />}
        ListFooterComponent={<ListingsFooter loadingMore={f.isFetchingNextPage} session={adSession} />}
        ListEmptyComponent={
          f.isLoading ? (
            <ProductGridSkeleton />
          ) : (
            <ProductListEmpty filtered={f.activeFilterCount > 0} onClearFilters={f.clearFilters} />
          )
        }
      />
    </PageShell>
  );
}
