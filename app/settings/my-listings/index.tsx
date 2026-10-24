import { useCallback } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import Animated from 'react-native-reanimated';
import {
  FAB,
  Spinner,
  TopBarAction,
  pageListContentStyle,
  useFabContentInset,
  usePageScrollHandler,
  useReadableContentStyle,
} from '@/ui';
import { PageShell } from '@/components/common/PageShell';
import { RowListSkeleton } from '@/components/common/RowListSkeleton';
import { BoostModal } from '@/components/product/BoostModal';
import { styles } from './_lib/styles';
import { useMyListings } from './_hooks/useMyListings';
import {
  MyListingsLimitCard,
  MyListingsFilters,
  MyListingCard,
  MyListingsEmpty,
  MyListingsExpiredBanner,
  MyListingsExpiredBar,
} from './_components/MyListingsSections';
import { MyListingsModals } from './_components/MyListingsModals';
import { navigateTo } from '@/lib/navigation/goTo';
import { listWindowing } from '@/lib/list/windowing';
import type { Listing } from './_lib/types';

const listingKey = (listing: Listing) => listing.id;

/**
 * My listings management — THIN screen. The `useMyListings` controller owns the
 * queries, mutations, quota derivation, and action-menu dispatch; this file
 * composes the limit card, filters, list, modals, boost modal, and FAB. PageShell (list modu):
 * Skeleton / hata + yeniden dene; liste sanallaştırılmış ve sayfalı (sonsuz kaydırma), çekip
 * yenileme FlatList'te; modallar ve FAB `overlay` slotunda.
 */
export default function MyListingsScreen() {
  const f = useMyListings();
  const fabInset = useFabContentInset();
  const page = usePageScrollHandler();
  // Readable width on large screens (src/ui/CLAUDE.md › Large screens).
  const listContentStyle = useReadableContentStyle([pageListContentStyle, { paddingBottom: fabInset }]);
  const { openActionMenu, isExpiredTab, selection } = f;
  const selected = selection.selected;
  // Kararlı renderItem (satır başına closure yok → memo'lu MyListingCard yeniden çizilmez).
  const renderListing = useCallback(
    ({ item }: { item: Listing }) => (
      <MyListingCard
        listing={item}
        onMenu={openActionMenu}
        selectable={isExpiredTab}
        checked={isExpiredTab && selected.has(item.id)}
        onToggleSelect={selection.toggle}
      />
    ),
    [openActionMenu, isExpiredTab, selected, selection.toggle],
  );

  return (
    <PageShell
      mode="list"
      scroll={page}
      title={f.t('mobile.settingsMyListings')}
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
      right={
        <TopBarAction
          icon="chart-bar"
          accessibilityLabel={f.t('mobile.settingsStatistics')}
          onPress={() => router.push('/settings/analytics')}
        />
      }
      loading={f.isLoading}
      loadingFallback={<RowListSkeleton rows={4} />}
      error={f.isError ? true : undefined}
      errorTitle={f.t('favorites.loadFailedTitle')}
      errorMessage={f.t('listing.loadListingsFailed')}
      onRetry={() => f.refetch()}
      overlay={
        <>
          <MyListingsModals f={f} />

          {/* Boost / Öne Çıkar Modal */}
          <BoostModal
            visible={f.boostListing !== null}
            onClose={() => f.setBoostListing(null)}
            listingId={f.boostListing?.id ?? ''}
            listingTitle={f.boostListing?.title ?? ''}
            boostedUntil={f.boostListing?.boostedUntil ?? null}
            isPremium={f.isPremiumUser}
          />

          {/* FAB */}
          {f.canCreateNew && (
            <FAB
              icon="plus"
              accessibilityLabel={f.t('listing.createNewA11y')}
              placement="bottomRight"
              contentWidth="readable"
              onPress={() => navigateTo('/(tabs)/sell')}
            />
          )}
        </>
      }
    >
      <Animated.FlatList
        {...page.listProps}
        testID="my-listings-list"
        data={f.filteredListings}
        keyExtractor={listingKey}
        renderItem={renderListing}
        {...listWindowing}
        contentContainerStyle={page.contentStyle(listContentStyle)}
        refreshing={f.refreshing}
        onRefresh={f.onRefresh}
        onEndReached={f.loadMore}
        onEndReachedThreshold={0.4}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <MyListingsLimitCard f={f} />
            <MyListingsFilters f={f} />
            <MyListingsExpiredBanner f={f} />
            <MyListingsExpiredBar f={f} />
          </View>
        }
        ListFooterComponent={f.isFetchingNextPage ? <Spinner style={styles.footerSpinner} /> : null}
        ListEmptyComponent={<MyListingsEmpty filter={f.filter} />}
      />
    </PageShell>
  );
}
