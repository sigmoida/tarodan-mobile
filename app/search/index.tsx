import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { View, RefreshControl } from 'react-native';
import Animated from 'react-native-reanimated';
import { FlashList, type ListRenderItemInfo } from '@shopify/flash-list';
import { ErrorState, FAB, FAB_SIZE_SM, Spinner, theme, useFabContentInset } from '@/ui';
import { PageShell } from '@/components/common/PageShell';
import {
  ProductCard,
  ProductGridSkeleton,
  ProductListEmpty,
  ProductSortModal,
} from '@/components/product';
import ProductFilterSheet from '@/components/ProductFilterSheet';
import { styles } from './_lib/searchStyles';
import { SEARCH_DRAW_DISTANCE, SEARCH_NUM_COLUMNS } from './_lib/searchConstants';
import { useSearch } from './_hooks/useSearch';
import { SearchBars } from './_components/SearchBars';

const { colors } = theme;

// Reanimated scroll handler'ı FlashList'te çalışsın diye animated sarmal (olay UI thread'ine bağlanır;
// FlashList'in kendi geri dönüşüm takibi etkilenmez).
const AnimatedFlashList = Animated.createAnimatedComponent(FlashList<any>);

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

  // Stable renderItem (#75) — memoized ProductCard bails out on unchanged rows.
  const isList = f.layout === 'list';
  const columns = isList ? 1 : SEARCH_NUM_COLUMNS;
  const renderResult = useCallback(
    ({ item }: ListRenderItemInfo<any>) => (
      // Hücre genişliğini FlashList verir; sütun boşluğu SİMETRİK hücre dolgusuyla. index'e bağlı değil:
      // FlashList hücresi index değişince yeniden render etmez, başa öğe girerse sol/sağ ters kalırdı.
      <View style={styles.cell}>
        <ProductCard testID="search-result-card" product={item} layout={isList ? 'list' : 'grid'} />
      </View>
    ),
    [isList],
  );

  // Son sonuç satırı yukarı-çık FAB'ının ve gezinme çubuğunun altında kalmasın.
  const fabInset = useFabContentInset(FAB_SIZE_SM);
  // Liste prop'ları kararlı kalsın: ekran render olsa da liste boş yere uzlaştırılmasın.
  const contentContainerStyle = useMemo(
    () => [styles.listContent, { paddingTop: f.headerHeight, paddingBottom: fabInset }],
    [f.headerHeight, fabInset],
  );
  const refreshControl = useMemo(
    () => (
      <RefreshControl
        refreshing={f.refreshing}
        onRefresh={f.refreshFirstPage}
        colors={[colors.primary[600]!]}
        tintColor={colors.primary[600]!}
      />
    ),
    [f.refreshing, f.refreshFirstPage],
  );
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = f;
  const onEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);
  const listFooter = useMemo(
    () =>
      isFetchingNextPage ? (
        <View style={styles.listFooter}>
          <Spinner size="md" color={colors.primary[600]!} />
        </View>
      ) : null,
    [isFetchingNextPage],
  );
  const { isLoading, isError, refetch, activeFiltersCount, clearAllFilters } = f;
  const hasSearch = !!f.filters.search;
  const listEmpty = useMemo(
    () =>
      isLoading ? (
        <ProductGridSkeleton />
      ) : isError ? (
        <ErrorState title={t('utility.error500.title')} onRetry={refetch} />
      ) : (
        <ProductListEmpty
          filtered={activeFiltersCount > 0 || hasSearch}
          // Temizle aramayı korur; yalnız aramada düğme işe yaramaz → gösterme.
          onClearFilters={activeFiltersCount > 0 ? clearAllFilters : undefined}
        />
      ),
    [isLoading, isError, refetch, activeFiltersCount, hasSearch, clearAllFilters, t],
  );

  const { setSortModalVisible, setFilterModalVisible, setSortBy } = f;
  const openSort = useCallback(() => setSortModalVisible(true), [setSortModalVisible]);
  const openFilter = useCallback(() => setFilterModalVisible(true), [setFilterModalVisible]);
  const closeFilter = useCallback(() => setFilterModalVisible(false), [setFilterModalVisible]);
  const closeSort = useCallback(() => setSortModalVisible(false), [setSortModalVisible]);
  const selectSort = useCallback(
    (sortBy: string) => {
      setSortBy(sortBy);
      setSortModalVisible(false);
    },
    [setSortBy, setSortModalVisible],
  );

  return (
    <PageShell title={t('common.search')} mode="list" keyboardAware={false}>
      <View style={styles.container}>
        {/* Üst çubuklar absolute katmanda; kaydırınca translateY ile yukarı kayar (liste reflow olmaz) */}
        <View style={styles.resultsArea}>
          <SearchBars
            translateY={f.barsTranslateY}
            onBarsLayout={f.onBarsLayout}
            initialQuery={f.initialQuery}
            inputCommand={f.inputCommand}
            onInputEmptyChange={f.setInputEmpty}
            autoFocus={f.autoFocusSearch}
            suggestionsOpen={f.suggestionsOpen}
            onCommit={f.commitQuery}
            onSubmit={f.saveRecentSearch}
            onClose={f.closeSuggestions}
            onFocus={f.onInputFocus}
            onBlur={f.onInputBlur}
            sortBy={f.filters.sortBy}
            onSort={openSort}
            onFilter={openFilter}
            filterCount={f.activeFiltersCount}
            layout={f.layout}
            onLayoutChange={f.setLayout}
            isLoading={f.isLoading}
            total={f.total}
            chips={f.activeChips}
            onClearFilters={f.clearAllFilters}
            showRecentSearches={f.showRecentSearches}
            recentSearchQueries={f.recentSearchQueries}
            inputEmpty={f.inputEmpty}
            onClearRecent={f.clearSearches}
            onSelectRecent={f.handleRecentSearchSelect}
            onRemoveRecent={f.removeSearch}
            autocompleteOpen={f.autocompleteOpen}
            autocompleteQuery={f.autocompleteQuery}
            autocomplete={f.autocomplete}
            sellerResults={f.sellerResults}
            onPickSuggestion={f.pickSuggestion}
            onCloseAutocomplete={f.closeAutocomplete}
            onNavigateSuggestion={f.confirmQuery}
            onApplyFacet={f.applyFacet}
          />

          {/* Results — liste yükleme/boş durumda da MONTE kalır (sökülüp yeniden
              yerleşmesin diye); üst çubuklar ölçülene kadar yalnızca görünmez. */}
          {/* Gizleme FlashList'e `style` ile verilemez (Reanimated style'ı diziye çevirir, RecyclerView
              dış View'da nesne olarak yayar → opacity kaybolur): sarmalayıcı View'a uygulanır. */}
          <View testID="search-results-wrap" style={f.barsMeasured ? styles.listWrap : styles.listWrapHidden}>
            <AnimatedFlashList
            testID="search-results-list"
            ref={f.listRef}
            data={f.products}
            key={`search-${columns}`}
            numColumns={columns}
            contentContainerStyle={contentContainerStyle}
            keyExtractor={keyExtractor}
            renderItem={renderResult}
            // Hücre geri dönüşümü (FlashList v2): pencere = drawDistance; getItemLayout/estimatedItemSize gerekmez.
            drawDistance={SEARCH_DRAW_DISTANCE}
            showsVerticalScrollIndicator={false}
            onScroll={f.handleResultsScroll}
            scrollEventThrottle={16}
            keyboardDismissMode="on-drag"
            refreshControl={refreshControl}
            onEndReached={onEndReached}
            onEndReachedThreshold={0.5}
            ListFooterComponent={listFooter}
            ListEmptyComponent={listEmpty}
          />
          </View>
        </View>

        {/* En üste dön butonu — liste yeterince aşağı inince görünür */}
        {f.showScrollTop && (
          <FAB
            icon="chevron-up"
            size="sm"
            placement="bottomRight"
            style={styles.scrollTopFab}
            onPress={f.scrollToTop}
            accessibilityLabel={t('search.scrollToTop')}
          />
        )}

        {/* Filter Modal (web SidebarFilters paritesi) */}
        <ProductFilterSheet
          visible={f.filterModalVisible}
          onClose={closeFilter}
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
          onSelect={selectSort}
          onClose={closeSort}
        />
      </View>
    </PageShell>
  );
}
