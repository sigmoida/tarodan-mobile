import React, { useCallback } from 'react';
import { RefreshControl, StyleSheet, View, type ListRenderItemInfo } from 'react-native';
import Animated from 'react-native-reanimated';
import { EmptyState, ErrorState, Spinner, pageListContentStyle, theme, useShellPageScroll, type PageScroll } from '@/ui';
import { ProductCard, type ProductCardLayout, type ProductCardProduct } from './ProductCard';
import { PRODUCT_GRID_GAP, ProductGridSkeleton, ProductListEmpty, useProductCellWidth } from './ProductListStates';

const { colors } = theme;

type ProductGridProps = ProductGridBaseProps &
  // Özel boş durum: başlık verilirse alt başlık da ZORUNLU (EmptyState kuralı), bağlama uygun metinle.
  ({ emptyTitle?: undefined; emptySubtitle?: undefined } | { emptyTitle: string; emptySubtitle: string });

interface ProductGridBaseProps {
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
  onItemPress?: (product: ProductCardProduct) => void;
  showMeta?: boolean;
  testID?: string;
  /**
   * Ekranın kendi kaydırma sinyali (ör. alt menülü yığın ekranı: `useTabBarPageScroll()`, aynı değer
   * `<PageShell scroll={page}>`a da verilir). Verilirse kabuk bağlamı yerine liste buna bağlanır.
   */
  scroll?: PageScroll;
  /** İçeriğin alt dolgusu (ör. yüzen alt menü: `useTabBarInset()`); verilmezse varsayılan. */
  bottomInset?: number;
}

// Kararlı anahtar: yalnız `id` (index YOK) — sayfa kayması/yeniden sıralamada hücreler sökülmesin.
const keyExtractor = (item: ProductCardProduct) => String(item.id);

interface GridCellProps {
  item: ProductCardProduct;
  layout: ProductCardLayout;
  width: number;
  showMeta: boolean;
  onItemPress?: (product: ProductCardProduct) => void;
}

/** Tek hücre: `onPress` ürün başına KARARLI kalır (memo'lu `ProductCard` kaydırmada yeniden çizilmez). */
const GridCell = React.memo(function GridCell({ item, layout, width, showMeta, onItemPress }: GridCellProps) {
  const handlePress = useCallback(() => onItemPress?.(item), [onItemPress, item]);
  return (
    <View style={layout === 'list' ? styles.listCell : { width }}>
      <ProductCard product={item} layout={layout} showMeta={showMeta} onPress={onItemPress ? handlePress : undefined} />
    </View>
  );
});

/**
 * Ürün listelerinin TEK ızgara/listesi: 2 sütun (web `grid-cols-2 gap-3`) ya da tek sütun liste, sonsuz
 * kaydırma, çekip yenileme; yükleniyor = iskelet, boş = tek boş durum, hata = ErrorState.
 * Kartlar memo'lu `ProductCard`; `renderItem` kararlı (kaydırmada satırlar yeniden çizilmez).
 * Bir kabuğun (`PageShell mode="list"` / `AppShell`) altındaysa listeyi kabuğun kaydırma kenarı
 * sinyaline OTOMATİK bağlar (içerik üst barın altından kayar, ekranlar değişmez); kabuk yoksa düz liste.
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
  scroll,
  bottomInset,
}: ProductGridProps) {
  const columns = layout === 'list' ? 1 : 2;
  // Tek tük kalan son kart komşusundan geniş olmasın: hücre genişliği açık verilir.
  const cellWidth = useProductCellWidth();

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<ProductCardProduct>) => (
      <GridCell item={item} layout={layout} width={cellWidth} showMeta={showMeta} onItemPress={onItemPress} />
    ),
    [layout, showMeta, onItemPress, cellWidth],
  );

  // Kabuk kaydırma sinyali (yoksa null → bağlanmaz). iOS `contentInset` + Android üst dolgusu
  // `contentStyle` ile tek yerden verilir; `ListHeaderComponent` ek boşluk almaz (çift boşluk yok).
  // Ekran kendi sinyalini verdiyse kabuğa bağlanılmaz (kabuk zaten o sinyali gösterir).
  const shellPage = useShellPageScroll(!scroll);
  const page = scroll ?? shellPage;
  const content = bottomInset == null ? styles.content : [styles.content, { paddingBottom: bottomInset }];

  const empty = errorMessage ? (
    <ErrorState message={errorMessage} onRetry={onRetry} />
  ) : loading ? (
    <ProductGridSkeleton layout={layout} />
  ) : emptyTitle ? (
    <EmptyState icon="magnifying-glass" title={emptyTitle} subtitle={emptySubtitle} />
  ) : (
    <ProductListEmpty filtered={filtered} onClearFilters={onClearFilters} />
  );

  return (
    <Animated.FlatList
      testID={testID}
      key={`${layout}-${columns}`}
      data={loading || errorMessage ? [] : items}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      numColumns={columns}
      {...(page?.listProps ?? null)}
      contentContainerStyle={page ? page.contentStyle(content) : content}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
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
            progressViewOffset={page?.topInset}
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
