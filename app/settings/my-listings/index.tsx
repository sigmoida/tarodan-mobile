import { router } from 'expo-router';
import { FAB, TopBarAction, useFabContentInset } from '@/ui';
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

/**
 * My listings management — THIN screen. The `useMyListings` controller owns the
 * queries, mutations, quota derivation, and action-menu dispatch; this file
 * composes the limit card, filters, list, modals, boost modal, and FAB. PageShell:
 * Skeleton / hata + yeniden dene / çekip yenileme; modallar ve FAB `overlay` slotunda.
 */
export default function MyListingsScreen() {
  const f = useMyListings();
  const fabInset = useFabContentInset();

  return (
    <PageShell
      contentStyle={{ paddingBottom: fabInset }}
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
      refreshing={f.refreshing}
      onRefresh={f.onRefresh}
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
              onPress={() => router.push('/(tabs)/sell')}
            />
          )}
        </>
      }
    >
      <MyListingsLimitCard f={f} />
      <MyListingsFilters f={f} />
      <MyListingsExpiredBanner f={f} />
      <MyListingsExpiredBar f={f} />

      {/* Listings */}
      {f.filteredListings.map((listing) => (
        <MyListingCard
          key={listing.id}
          listing={listing}
          onMenu={() => f.openActionMenu(listing)}
          selection={
            f.isExpiredTab
              ? { checked: f.selection.selected.has(listing.id), onToggle: () => f.selection.toggle(listing.id) }
              : undefined
          }
        />
      ))}

      {f.filteredListings.length === 0 && !f.isLoading && <MyListingsEmpty filter={f.filter} />}
    </PageShell>
  );
}
