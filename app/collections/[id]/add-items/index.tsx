import { useCallback } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import { Button, EmptyState, ErrorState, Input, SkeletonText, pageListContentStyle, usePageScrollHandler } from '@/ui';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { listWindowing } from '@/lib/list/windowing';
import { PageShell } from '@/components/common/PageShell';
import { useAddItems } from './_hooks/useAddItems';
import { styles } from './_lib/styles';
import type { Listing } from './_lib/types';
import { ListingPickerRow } from './_components/ListingPickerRow';
import { navigateTo } from '@/lib/navigation/goTo';

const listingKey = (listing: { id: string }) => listing.id;

/** Koleksiyona ürün ekle — PageShell + arama ve ilan satırları (Ekle/Çıkar). `useAddItems` optimistic mantığın sahibi. */
export default function AddCollectionItemsScreen() {
  const { t } = useTranslation();
  const f = useAddItems();
  const page = usePageScrollHandler();
  const { effectiveItemId, pending, toggle } = f;
  const renderListing = useCallback(
    ({ item }: { item: Listing }) => (
      <ListingPickerRow
        listing={item}
        added={!!effectiveItemId(item.id)}
        busy={!!pending[item.id]}
        onToggle={toggle}
      />
    ),
    // `effectiveItemId` overlay/sunucu haritası değişince yenilenir → satırlar yeni `added` alır.
    [effectiveItemId, pending, toggle],
  );

  return (
    <PageShell
      title={t('collection.addProduct')}
      mode="list"
      scroll={page}
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
    >
      <Animated.FlatList
        {...page.listProps}
        data={f.isLoading || f.loadFailed ? [] : f.filtered}
        keyExtractor={listingKey}
        renderItem={renderListing}
        {...listWindowing}
        contentContainerStyle={page.contentStyle([pageListContentStyle, styles.list])}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <Input
            placeholder={t('collection.searchListingsPlaceholder')}
            value={f.search}
            onChangeText={f.setSearch}
            leftIconName="magnifying-glass"
            autoCorrect={false}
          />
        }
        ListEmptyComponent={
          f.isLoading ? (
            <View testID="add-items-skeleton">
              <SkeletonText lines={6} />
            </View>
          ) : f.loadFailed ? (
            <ErrorState placement="list" onRetry={f.retry} />
          ) : f.listings.length === 0 ? (
            <EmptyState
              placement="list"
              icon="cube"
              title={t('collection.noActiveListings')}
              subtitle={t('emptyState.collectionAddListingHint')}
              action={<Button title={t('product.createListing')} onPress={() => navigateTo('/(tabs)/sell')} />}
            />
          ) : (
            <EmptyState placement="list" icon="magnifying-glass" title={t('collection.noSearchMatch')} subtitle={t('search.tryDifferent')} />
          )
        }
      />
    </PageShell>
  );
}
