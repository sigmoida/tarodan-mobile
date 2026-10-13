import React, { useCallback } from 'react';
import { FlatList, RefreshControl, StyleSheet, View, type ListRenderItemInfo } from 'react-native';
import { EmptyState, ErrorState, Spinner, pageListContentStyle, theme } from '@/ui';
import { ProductCard, type ProductCardLayout, type ProductCardProduct } from './ProductCard';
import { PRODUCT_GRID_GAP, ProductGridSkeleton, ProductListEmpty, useProductCellWidth } from './ProductListStates';

const { colors } = theme;

interface ProductGridProps {
  items: ProductCardProduct[];
  layout?: ProductCardLayout;
  /** İlk yükleme: iskelet çizer (tam ekran spinner değil). */
  loading?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  /** Son sayfaya yaklaşınca tetiklenir. */
  onEndReached?: () => void;
  /** Sonraki sayfa yükleniyor (liste altında küçük gösterge). */
  loadingMore?: boolean;
  errorMessage?: string | null;
  onRetry?: () => void;
  ListHeaderComponent?: React.ComponentType<unknown> | React.ReactElement | null;
  ListFooterComponent?: React.ComponentType<unknown> | React.ReactElement | null;
  /** Boş durum: filtre uygulanmışsa "filtrelerinizi değiştirin" + temizle. */
  filtered?: boolean;
  onClearFilters?: () => void;
  /** Boş durumu özelleştirir (ör. üreticinin ürünü yok). */
  emptyTitle?: string;
  emptySubtitle?: string;
  onItemPress?: (product: ProductCardProduct) => void;
  showMeta?: boolean;
  testID?: string;
}

/**
 * Ürün listelerinin TEK ızgara/listesi: 2 sütun (web `grid-cols-2 gap-3`) ya da tek sütun liste, sonsuz
 * kaydırma, çekip yenileme; yükleniyor = iskelet, boş = tek boş durum, hata = ErrorState.
 * Kartlar memo'lu `ProductCard`; `renderItem` kararlı (kaydırmada satırlar yeniden çizilmez).
 */
export function ProductGrid({
  items,
  layout = 'grid',
  loading = false,
  refreshing = false,
  onRefresh,
  onEndReached,
  loadingMore = false,
  errorMessage,
  onRetry,
  ListHeaderComponent,
  ListFooterComponent,
  filtered = false,
  onClearFilters,
  emptyTitle,
  emptySubtitle,
  onItemPress,
  showMeta = true,
  testID,
}: ProductGridProps) {
  const columns = layout === 'list' ? 1 : 2;
  // Tek tük kalan son kart komşusundan geniş olmasın: hücre genişliği açık verilir.
  const cellWidth = useProductCellWidth();

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<ProductCardProduct>) => (
      <View style={layout === 'list' ? styles.listCell : { width: cellWidth }}>
        <ProductCard
          product={item}
          layout={layout}
          showMeta={showMeta}
          onPress={onItemPress ? () => onItemPress(item) : undefined}
        />
      </View>
    ),
    [layout, showMeta, onItemPress, cellWidth],
  );

  const empty = errorMessage ? (
    <ErrorState message={errorMessage} onRetry={onRetry} />
  ) : loading ? (
    <ProductGridSkeleton layout={layout} />
  ) : emptyTitle ? (
    <EmptyState icon="search-outline" title={emptyTitle} subtitle={emptySubtitle} />
  ) : (
    <ProductListEmpty filtered={filtered} onClearFilters={onClearFilters} />
  );

  return (
    <FlatList
      testID={testID}
      key={`${layout}-${columns}`}
      data={loading || errorMessage ? [] : items}
      keyExtractor={(item, index) => `${item.id}-${index}`}
      renderItem={renderItem}
      numColumns={columns}
      contentContainerStyle={styles.content}
      columnWrapperStyle={columns > 1 ? styles.row : undefined}
      ListHeaderComponent={ListHeaderComponent}
      ListEmptyComponent={empty}
      ListFooterComponent={
        loadingMore ? (
          <View style={styles.more}>
            <Spinner size="md" color={colors.primary[600]!} />
          </View>
        ) : (
          ListFooterComponent ?? null
        )
      }
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary[600]!]}
            tintColor={colors.primary[600]!}
          />
        ) : undefined
      }
      onEndReached={onEndReached}
      onEndReachedThreshold={0.5}
      removeClippedSubviews
      maxToRenderPerBatch={10}
      windowSize={7}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  content: { ...pageListContentStyle, gap: PRODUCT_GRID_GAP, flexGrow: 1 },
  row: { gap: PRODUCT_GRID_GAP },
  listCell: { width: '100%' },
  more: { paddingVertical: theme.spacing[4] },
});

export default ProductGrid;
