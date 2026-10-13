import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { View, FlatList, RefreshControl } from 'react-native';
import { ErrorState, FAB, Spinner, theme } from '@/ui';
import { PageShell } from '@/components/common/PageShell';
import {
  ProductCard,
  ProductGridSkeleton,
  ProductListEmpty,
  ProductSortModal,
  useProductCellWidth,
} from '@/components/product';
import ProductFilterSheet from '@/components/ProductFilterSheet';
import { styles } from './_lib/searchStyles';
import { SEARCH_NUM_COLUMNS } from './_lib/searchConstants';
import { useSearch } from './_hooks/useSearch';
import { SearchBars } from './_components/SearchBars';

const { colors, spacing } = theme;

// Kararlı anahtar: yalnız `id` (index YOK) — sayfa kayması/yeniden sıralamada hücreler sökülmesin.
const keyExtractor = (item: any) => String(item.id);

/**
 * Arama — yığın ekranı (`/search`), THIN screen. The `useSearch` controller owns filters, debounced
 * search, autocomplete, the infinite product query, and scroll/collapse state;
 * this file composes the PageShell, collapsible bars, results list, and modals.
 */
export default function SearchScreen() {
  const { t } = useTranslation();
  const f = useSearch();
  const cellWidth = useProductCellWidth();

  // Stable renderItem (#75) — memoized ProductCard bails out on unchanged rows.
  const isList = f.layout === 'list';
  const columns = isList ? 1 : SEARCH_NUM_COLUMNS;
  const renderResult = useCallback(
    ({ item }: { item: any }) => (
      <View style={{ width: isList ? '100%' : cellWidth }}>
        <ProductCard testID="search-result-card" product={item} layout={isList ? 'list' : 'grid'} />
      </View>
    ),
    [cellWidth, isList],
  );

  return (
    <PageShell title={t('common.search')} mode="list" keyboardAware={false}>
      <View style={styles.container}>
        {/* Üst çubuklar absolute katmanda; kaydırınca translateY ile yukarı kayar (liste reflow olmaz) */}
        <View style={styles.resultsArea}>
          <SearchBars f={f} />

          {/* Results — liste yükleme/boş durumda da MONTE kalır (sökülüp yeniden
              yerleşmesin diye); üst çubuklar ölçülene kadar yalnızca görünmez. */}
          <FlatList
            testID="search-results-list"
            ref={f.listRef}
            data={f.products}
            key={`search-${columns}`}
            numColumns={columns}
            style={f.barsMeasured ? undefined : styles.listHidden}
            contentContainerStyle={[styles.listContent, { paddingTop: f.headerHeight }]}
            columnWrapperStyle={columns > 1 ? styles.listRow : undefined}
            keyExtractor={keyExtractor}
            renderItem={renderResult}
            // #82: virtualizasyon ayarı — sonsuz arama sonuçlarında bellek/kaydırma.
            windowSize={7}
            initialNumToRender={8}
            maxToRenderPerBatch={10}
            removeClippedSubviews
            showsVerticalScrollIndicator={false}
            onScroll={f.handleResultsScroll}
            scrollEventThrottle={16}
            keyboardDismissMode="on-drag"
            refreshControl={
              <RefreshControl
                refreshing={f.isRefetching}
                onRefresh={f.refetch}
                colors={[colors.primary[600]!]}
                tintColor={colors.primary[600]!}
              />
            }
            onEndReached={() => {
              if (f.hasNextPage && !f.isFetchingNextPage) f.fetchNextPage();
            }}
            onEndReachedThreshold={0.5}
            ListFooterComponent={
              f.isFetchingNextPage ? (
                <View style={{ paddingVertical: spacing[4] }}>
                  <Spinner size="md" color={colors.primary[600]!} />
                </View>
              ) : null
            }
            ListEmptyComponent={
              f.isLoading ? (
                <ProductGridSkeleton />
              ) : f.isError ? (
                <ErrorState title={t('utility.error500.title')} onRetry={f.refetch} />
              ) : (
                <ProductListEmpty filtered={f.activeFiltersCount > 0 || !!f.filters.search} onClearFilters={f.clearAllFilters} />
              )
            }
          />
        </View>

        {/* En üste dön butonu — liste yeterince aşağı inince görünür */}
        {f.showScrollTop && (
          <FAB
            icon="chevron-up"
            size="sm"
            style={styles.scrollTopFab}
            onPress={f.scrollToTop}
            accessibilityLabel={t('search.scrollToTop')}
          />
        )}

        {/* Filter Modal (web SidebarFilters paritesi) */}
        <ProductFilterSheet
          visible={f.filterModalVisible}
          onClose={() => f.setFilterModalVisible(false)}
          filters={f.filters}
          onChange={f.setFilters}
          onClear={f.clearAllFilters}
          options={f.options}
          resultCount={f.total}
          countLoading={f.isFetching && !f.isFetchingNextPage}
        />

        {/* Sort Modal */}
        <ProductSortModal
          visible={f.sortModalVisible}
          value={f.filters.sortBy}
          onSelect={(sortBy) => {
            f.setFilters({ ...f.filters, sortBy });
            f.setSortModalVisible(false);
          }}
          onClose={() => f.setSortModalVisible(false)}
        />
      </View>
    </PageShell>
  );
}
