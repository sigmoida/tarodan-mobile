import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { View, RefreshControl } from 'react-native';
import Animated, { useComposedEventHandler } from 'react-native-reanimated';
import { FlashList, type ListRenderItemInfo } from '@shopify/flash-list';
import { ErrorState, FAB, Spinner, theme, useDelayedLoading } from '@/ui';
import { PageShell } from '@/components/common/PageShell';
import { ListFooterRetry } from '@/components/common/ListFooterRetry';
import {
  ProductCard,
  ProductGridSkeleton,
  ProductListEmpty,
  ProductSortModal,
  useProductGridColumns,
} from '@/components/product';
import ProductFilterSheet from '@/components/ProductFilterSheet';
import { withStackTabBar } from '@/components/shell/StackTabBar';
import { useTabBarScrollHandler } from '@/components/shell/TabBarCollapse';
import { useProductCardFavorites } from '@/hooks/useFavoriteToggle';
import { styles } from './_lib/searchStyles';
import { SEARCH_DRAW_DISTANCE } from './_lib/searchConstants';
import { useTransitionReady } from '@/hooks/useTransitionReady';
import { useSearch } from './_hooks/useSearch';
import { useSearchBottomChrome } from './_hooks/useSearchBottomChrome';
import { useSaveSearch } from './_hooks/useSaveSearch';
import { SaveSearchModal } from './_modals/SaveSearchModal';
import { SearchBars } from './_components/SearchBars';
import { SearchHeaderField, SearchSuggestionsLayer } from './_components/SearchHeader';

const { colors } = theme;

// Reanimated scroll handler'ı FlashList'te çalışsın diye animated sarmal (olay UI thread'ine bağlanır;
// FlashList'in kendi geri dönüşüm takibi etkilenmez).
const AnimatedFlashList = Animated.createAnimatedComponent(FlashList<any>);

// Kararlı anahtar: yalnız `id` (index YOK) — sayfa kayması/yeniden sıralamada hücreler sökülmesin.
const keyExtractor = (item: any) => String(item.id);
// Geçiş bitene kadar listeye verilen sabit boş dizi (kimliği değişmesin).
const NO_ITEMS: any[] = [];

/**
 * Arama — yığın ekranı (`/search`), THIN screen. The `useSearch` controller owns filters, debounced
 * search, autocomplete, the infinite product query, and scroll/collapse state;
 * this file composes the PageShell, collapsible bars, results list, and modals.
 *
 * Üst bar: solda geri oku, kalan genişlikte arama alanı (`titleSlot` + `titleFill`; ana sayfadaki
 * cam hapla aynı yükseklik/konum). Açılış performansı: native stack yeni ekranın ilk karesini
 * bekleyip kaydırır; geçiş sürerken klavye açmak ve 24 kartı çizmek animasyonu takılır gösteriyordu.
 * İkisi de `useTransitionReady`'ye bağlı: odak ve sonuç kartları geçiş bitince (o ana dek iskelet;
 * sorgu arka planda zaten koşar).
 */
function SearchScreen() {
  const { t } = useTranslation();
  const f = useSearch();
  const saveSearch = useSaveSearch(f.filters, f.options);
  const ready = useTransitionReady();

  // Stable renderItem (#75) — memoized ProductCard bails out on unchanged rows.
  const isList = f.layout === 'list';
  // Same column rule as every listing grid (2 on phones, more on tablets); the list key follows it.
  const gridColumns = useProductGridColumns();
  const columns = isList ? 1 : gridColumns;
  const favoriteProps = useProductCardFavorites();
  const renderResult = useCallback(
    ({ item }: ListRenderItemInfo<any>) => (
      // Hücre genişliğini FlashList verir; sütun boşluğu SİMETRİK hücre dolgusuyla. index'e bağlı değil:
      // FlashList hücresi index değişince yeniden render etmez, başa öğe girerse sol/sağ ters kalırdı.
      <View style={styles.cell}>
        <ProductCard
          testID="search-result-card"
          product={item}
          layout={isList ? 'list' : 'grid'}
          {...favoriteProps(item)}
        />
      </View>
    ),
    [isList, favoriteProps],
  );

  // One scroll handler for the list: the search bars collapse / scroll-to-top flag (`useSearch`) and the
  // floating tab bar collapse run side by side (composed, never two `onScroll` props).
  const tabScroll = useTabBarScrollHandler();
  const onResultsScroll = useComposedEventHandler([f.handleResultsScroll, tabScroll.onScroll]);
  // The last result row stays clear of the scroll-to-top FAB, which floats above the tab bar.
  const { listBottomInset, scrollTopFabStyle } = useSearchBottomChrome();
  // Liste prop'ları kararlı kalsın: ekran render olsa da liste boş yere uzlaştırılmasın.
  const contentContainerStyle = useMemo(
    () => [styles.listContent, { paddingTop: f.headerHeight, paddingBottom: listBottomInset }],
    [f.headerHeight, listBottomInset],
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
  const { hasNextPage, isFetchingNextPage, isFetchNextPageError, fetchNextPage } = f;
  const onEndReached = useCallback(() => {
    // Sayfa hatasında kaydırdıkça otomatik yeniden denemez; kullanıcı "Tekrar dene" satırına basar.
    if (hasNextPage && !isFetchingNextPage && !isFetchNextPageError) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, isFetchNextPageError, fetchNextPage]);
  const retryNextPage = useCallback(() => {
    void fetchNextPage();
  }, [fetchNextPage]);
  const listFooter = useMemo(
    () =>
      isFetchNextPageError ? (
        <ListFooterRetry onRetry={retryNextPage} />
      ) : isFetchingNextPage ? (
        <View style={styles.listFooter}>
          <Spinner size="md" color={colors.primary[600]!} />
        </View>
      ) : null,
    [isFetchingNextPage, isFetchNextPageError, retryNextPage],
  );
  const { isLoading, isError, refetch, activeFiltersCount, clearAllFilters } = f;
  const hasSearch = !!f.filters.search;
  // İlk yükleme iskeleti gecikmeli: <150 ms süren yüklemede hiç çizilmez (göz kırpma yok).
  const loadingFirst = isLoading || !ready;
  const showSkeleton = useDelayedLoading(loadingFirst);
  const listEmpty = useMemo(
    () =>
      loadingFirst || showSkeleton ? (
        showSkeleton ? <ProductGridSkeleton /> : null
      ) : isError ? (
        <ErrorState title={t('utility.error500.title')} onRetry={refetch} />
      ) : (
        <ProductListEmpty
          filtered={activeFiltersCount > 0 || hasSearch}
          // Temizle aramayı korur; yalnız aramada düğme işe yaramaz → gösterme.
          onClearFilters={activeFiltersCount > 0 ? clearAllFilters : undefined}
        />
      ),
    [loadingFirst, showSkeleton, isError, refetch, activeFiltersCount, hasSearch, clearAllFilters, t],
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
    <PageShell
      title={t('common.search')}
      mode="list"
      contentWidth="full"
      keyboardAware={false}
      titleFill
      titleSlot={
        <SearchHeaderField f={f} ready={ready} />
      }
    >
      <View style={styles.container}>
        {/* Üst çubuklar absolute katmanda; kaydırınca translateY ile yukarı kayar (liste reflow olmaz) */}
        <View style={styles.resultsArea}>
          <SearchBars
            translateY={f.barsTranslateY}
            onBarsLayout={f.onBarsLayout}
            sortBy={f.filters.sortBy}
            onSort={openSort}
            onFilter={openFilter}
            filterCount={f.activeFiltersCount}
            layout={f.layout}
            onLayoutChange={f.setLayout}
            onSave={saveSearch.start}
            saveDisabled={saveSearch.draft.isEmpty}
            isLoading={f.isLoading}
            total={f.total}
            chips={f.activeChips}
            onClearFilters={f.clearAllFilters}
            contextLabel={f.contextLabel}
          />

          {/* Öneri / son aramalar: üst barın hemen altında, çubukların ve sonuçların üstünde. */}
          <SearchSuggestionsLayer f={f} />

          {/* Results — liste yükleme/boş durumda da MONTE kalır (sökülüp yeniden
              yerleşmesin diye); üst çubuklar ölçülene kadar yalnızca görünmez. */}
          {/* Gizleme FlashList'e `style` ile verilemez (Reanimated style'ı diziye çevirir, RecyclerView
              dış View'da nesne olarak yayar → opacity kaybolur): sarmalayıcı View'a uygulanır. */}
          <View testID="search-results-wrap" style={f.barsMeasured ? styles.listWrap : styles.listWrapHidden}>
            <AnimatedFlashList
            testID="search-results-list"
            ref={f.listRef}
            // Kartlar geçiş bitince çizilir (o ana dek boş-durum yuvasında iskelet).
            data={ready ? f.products : NO_ITEMS}
            key={`search-${columns}`}
            numColumns={columns}
            contentContainerStyle={contentContainerStyle}
            keyExtractor={keyExtractor}
            renderItem={renderResult}
            // Hücre geri dönüşümü (FlashList v2): pencere = drawDistance; getItemLayout/estimatedItemSize gerekmez.
            drawDistance={SEARCH_DRAW_DISTANCE}
            showsVerticalScrollIndicator={false}
            onScroll={onResultsScroll}
            onLayout={tabScroll.onLayout}
            onContentSizeChange={tabScroll.onContentSizeChange}
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
            style={scrollTopFabStyle}
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

        <SaveSearchModal draft={saveSearch.draft} isOpen={saveSearch.open} onClose={saveSearch.close} />

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

export default withStackTabBar(SearchScreen);
