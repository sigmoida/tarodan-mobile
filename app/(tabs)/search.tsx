import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { tabDiag } from '@/components/_tabDiag';
import { View, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button, Spinner, Text, theme } from '@/ui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ProductFilterSheet from '@/components/ProductFilterSheet';
import { styles } from './_lib/searchStyles';
import { SEARCH_NUM_COLUMNS } from './_lib/searchConstants';
import { useSearch } from './_hooks/useSearch';
import { SearchBars } from './_components/SearchBars';
import { SearchResultCard } from './_components/SearchResultCard';
import { SearchSortModal } from './_components/SearchSortModal';

const { colors, spacing } = theme;

/**
 * Search tab — THIN screen. The `useSearch` controller owns filters, debounced
 * search, autocomplete, the infinite product query, and scroll/collapse state;
 * this file composes the header, collapsible bars, results list, and modals.
 */
function SearchScreen() {
  const { t } = useTranslation();
  const f = useSearch();
  const insets = useSafeAreaInsets();

  // Stable renderItem (#75) — memoized SearchResultCard bails out on unchanged rows.
  const renderResult = useCallback(
    ({ item }: { item: any }) => (
      <SearchResultCard
        item={item}
        cartProductIds={f.cartProductIds}
        onPress={f.handleProductPress}
      />
    ),
    [f.cartProductIds, f.handleProductPress],
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, theme.spacing[3]) }]}>
        <Text style={styles.headerTitle}>{t('search.search')}</Text>
      </View>

      {/* Üst çubuklar absolute katmanda; kaydırınca translateY ile yukarı kayar (liste reflow olmaz) */}
      <View style={styles.resultsArea}>
        <SearchBars f={f} />

        {/* Results — liste yükleme/boş durumda da MONTE kalır (sökülüp yeniden
            yerleşmesin diye); üst çubuklar ölçülene kadar yalnızca görünmez. */}
        <FlatList
          testID="search-results-list"
          ref={f.listRef}
          data={f.products}
          numColumns={SEARCH_NUM_COLUMNS}
          style={f.barsMeasured ? undefined : styles.listHidden}
          contentContainerStyle={[styles.listContent, { paddingTop: f.headerHeight }]}
          columnWrapperStyle={styles.listRow}
          keyExtractor={(item, index) => `${item.id}-${index}`}
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
              <View style={styles.loadingContainer}>
                <Spinner size="lg" color={colors.primary[600]!} />
                <Text variant="body" tone="muted" style={styles.loadingText}>
                  {t('filter.resultsLoading')}
                </Text>
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="search-outline" size={64} color={colors.text.subtle} />
                <Text variant="h3" align="center" style={styles.emptyTitle}>
                  {f.isError ? t('utility.error500.title') : t('search.noResults')}
                </Text>
                <Text variant="body" tone="muted" align="center" style={styles.emptySubtitle}>
                  {t('search.tryDifferent')}
                </Text>
                <Button
                  variant="outline"
                  title={t('product.clearFilters')}
                  onPress={f.clearAllFilters}
                  style={{ marginTop: spacing[4], alignSelf: 'center' }}
                />
              </View>
            )
          }
        />
      </View>

      {/* En üste dön butonu — liste yeterince aşağı inince görünür */}
      {f.showScrollTop && (
        <TouchableOpacity
          style={styles.scrollTopFab}
          onPress={f.scrollToTop}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={t('search.scrollToTop')}
        >
          <Ionicons name="chevron-up" size={26} color={colors.white} />
        </TouchableOpacity>
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
      <SearchSortModal f={f} />
    </View>
  );
}

export default tabDiag('search', SearchScreen);
