import { useMemo } from 'react';
import { View, FlatList } from 'react-native';
import { useTranslation } from 'react-i18next';
import { theme, Text, Spinner, ScreenHeader } from '@/ui';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import ProductFilterSheet from '@/components/ProductFilterSheet';
import { AdBanner } from '@/components/ads/AdBanner';
import { withInlineAds, type GridRow } from '@/lib/ads/inlinePlacement';
import { useAdSession } from '@/lib/ads/useAdSession';
import { useListings } from './_hooks/useListings';
import { styles } from './_lib/styles';
import { ListingsSearchBar } from './_components/ListingsSearchBar';
import { ListingsSortModal } from './_components/ListingsSortModal';
import { ListingCard } from './_components/ListingCard';
import { ListingsFooter } from './_components/ListingsFooter';

const { colors, spacing } = theme;

export default function ListingsScreen() {
  const { t } = useTranslation();
  const f = useListings();
  // Izgara içi (inline) reklam: 8. karttan sonra, sonra 16'da bir, en çok 2 (web ile aynı).
  // 2 sütunlu ızgara satırlara bölünür; afiş tam genişlikte kendi satırında durur.
  const adSession = useAdSession();
  const rows = useMemo(() => withInlineAds(f.listings, 2), [f.listings]);

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={t('common.listings')}
        onBack={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
      />

      <ListingsSearchBar f={f} />
      <ListingsSortModal f={f} />

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

      {f.isLoading ? (
        <View style={styles.loadingContainer}>
          <Spinner size="lg" />
          <Text style={styles.loadingText}>{t('listing.loadingListings')}</Text>
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(row) => row.key}
          renderItem={({ item: row }: { item: GridRow<any> }) =>
            row.kind === 'ad' ? (
              <AdBanner position="inline" slotKey={`inline-${row.slot}`} session={adSession} />
            ) : (
              <View style={styles.listRow}>
                {row.items.map((item, i) => (
                  <ListingCard key={`${item.id}-${i}`} item={item} />
                ))}
              </View>
            )
          }
          contentContainerStyle={styles.listingsContent}
          showsVerticalScrollIndicator={false}
          refreshing={f.isRefetching}
          onRefresh={f.refetch}
          onEndReached={() => {
            if (f.hasNextPage && !f.isFetchingNextPage) f.fetchNextPage();
          }}
          onEndReachedThreshold={0.5}
          ListHeaderComponent={
            <>
              {/* Web ile aynı: /listings tepesinde header reklam yuvası. Liste içeriği
                  zaten yatay boşluk veriyor; yuvanın kendi boşluğunu geri al. */}
              <View style={{ marginHorizontal: -spacing[4] }}>
                <AdBanner position="header" session={adSession} />
              </View>
              <Text style={styles.resultsCount}>{t('listing.resultsCount', { count: f.total })}</Text>
            </>
          }
          ListFooterComponent={<ListingsFooter loadingMore={f.isFetchingNextPage} session={adSession} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="pricetag-outline" size={64} color={colors.text.subtle} />
              <Text style={styles.emptyTitle}>{t('product.listingNotFound')}</Text>
              <Text style={styles.emptySubtitle}>{t('listing.emptyFilterHint')}</Text>
            </View>
          }
        />
      )}
    </View>
  );
}
