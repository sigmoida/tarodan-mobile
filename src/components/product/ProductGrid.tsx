import React, { useCallback } from 'react';
import { RefreshControl, StyleSheet, View, type ListRenderItemInfo } from 'react-native';
import Animated from 'react-native-reanimated';
import {
  EmptyState,
  ErrorState,
  Spinner,
  pageListContentStyle,
  theme,
  useDelayedLoading,
  useShellPageScroll,
  type PageScroll,
} from '@/ui';
import { ListFooterRetry } from '@/components/common/ListFooterRetry';
import { useProductCardFavorites } from '@/hooks/useFavoriteToggle';
import { ProductCard, type ProductCardLayout, type ProductCardProduct } from './ProductCard';
import {
  PRODUCT_GRID_GAP,
  ProductGridSkeleton,
  ProductListEmpty,
  useProductCellWidth,
  useProductGridColumns,
} from './ProductListStates';

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
  /** Sonraki sayfa yüklenemedi: liste altında "Tekrar dene" satırı (`isFetchNextPageError`). */
  loadMoreFailed?: boolean;
  /** "Tekrar dene" satırının eylemi (genelde `fetchNextPage`). */
  onRetryLoadMore?: () => void;
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
  isFavorite?: boolean;
  onToggleFavorite?: (productId: string) => void;
}

/** Tek hücre: `onPress` ürün başına KARARLI kalır (memo'lu `ProductCard` kaydırmada yeniden çizilmez). */
const GridCell = React.memo(function GridCell({
  item,
  layout,
  width,
  showMeta,
  onItemPress,
  isFavorite,
  onToggleFavorite,
}: GridCellProps) {
  const handlePress = useCallback(() => onItemPress?.(item), [onItemPress, item]);
  return (
    <View style={layout === 'list' ? styles.listCell : { width }}>
      <ProductCard
        product={item}
        layout={layout}
        showMeta={showMeta}
        onPress={onItemPress ? handlePress : undefined}
        isFavorite={isFavorite}
        onToggleFavorite={onToggleFavorite}
      />
    </View>
  );
});

/**
 * Ürün listelerinin TEK ızgara/listesi: telefonda 2 sütun (web `grid-cols-2 gap-3`; tablette
 * `useProductGridColumns`) ya da tek sütun liste, sonsuz
 * kaydırma, çekip yenileme; yükleniyor = iskelet, boş = tek boş durum, hata = ErrorState.
 * Kartlar memo'lu `ProductCard`; `renderItem` kararlı (kaydırmada satırlar yeniden çizilmez).
 * Favori kalbi otomatik bağlanır (`useProductCardFavorites`; kendi ilanında yok, misafirde giriş akışı).
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
  loadMoreFailed = false,
  onRetryLoadMore,
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
  // Grid: 2 columns on phones, more on tablets (window width); the list's `key` follows the count.
  const gridColumns = useProductGridColumns();
  const columns = layout === 'list' ? 1 : gridColumns;
  // Tek tük kalan son kart komşusundan geniş olmasın: hücre genişliği açık verilir.
  const cellWidth = useProductCellWidth();
  // Favori kalbi: liste başına tek Set; hücreye ilkel `isFavorite` + sabit toggle (memo korunur).
  const favoriteProps = useProductCardFavorites();

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<ProductCardProduct>) => {
      const fav = favoriteProps(item);
      return (
        <GridCell
          item={item}
          layout={layout}
          width={cellWidth}
          showMeta={showMeta}
          onItemPress={onItemPress}
          isFavorite={fav.isFavorite}
          onToggleFavorite={fav.onToggleFavorite}
        />
      );
    },
    [layout, showMeta, onItemPress, cellWidth, favoriteProps],
  );

  // Kabuk kaydırma sinyali (yoksa null → bağlanmaz). iOS `contentInset` + Android üst dolgusu
  // `contentStyle` ile tek yerden verilir; `ListHeaderComponent` ek boşluk almaz (çift boşluk yok).
  // Ekran kendi sinyalini verdiyse kabuğa bağlanılmaz (kabuk zaten o sinyali gösterir).
  const shellPage = useShellPageScroll(!scroll);
  const page = scroll ?? shellPage;
  const content = bottomInset == null ? styles.content : [styles.content, { paddingBottom: bottomInset }];

  // İlk yükleme iskeleti gecikmeli: <150 ms süren yüklemede hiç çizilmez (göz kırpma yok).
  const showSkeleton = useDelayedLoading(loading);
  const empty = errorMessage ? (
    <ErrorState placement="list" message={errorMessage} onRetry={onRetry} />
  ) : loading || showSkeleton ? (
    showSkeleton ? <ProductGridSkeleton layout={layout} /> : null
  ) : emptyTitle ? (
    <EmptyState placement="list" icon="magnifying-glass" title={emptyTitle} subtitle={emptySubtitle} />
  ) : (
    <ProductListEmpty placement="list" filtered={filtered} onClearFilters={onClearFilters} />
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
        loadMoreFailed && onRetryLoadMore ? (
          <ListFooterRetry onRetry={onRetryLoadMore} />
        ) : loadingMore ? (
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
