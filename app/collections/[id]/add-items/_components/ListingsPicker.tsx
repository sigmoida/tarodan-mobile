import React, { useCallback } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import {
  Button,
  EmptyState,
  ErrorState,
  Input,
  SkeletonText,
  pageListContentStyle,
  usePageContentStyle,
  type usePageScrollHandler,
} from '@/ui';
import { listWindowing } from '@/lib/list/windowing';
import { navigateTo } from '@/lib/navigation/goTo';
import type { AddItemsController } from '../_hooks/useAddItems';
import { styles } from '../_lib/styles';
import type { Listing } from '../_lib/types';
import { ListingPickerRow } from './ListingPickerRow';

const listingKey = (listing: { id: string }) => listing.id;

/** The "My listings" segment: search + the owner's listings with an add / remove toggle per row. */
export function ListingsPicker({
  f,
  page,
  segments,
}: {
  f: AddItemsController;
  page: ReturnType<typeof usePageScrollHandler>;
  /** The segment switch, drawn above the search field inside the list. */
  segments: React.ReactNode;
}) {
  const { t } = useTranslation();
  // Large screens: edge to edge with the tablet gutter (src/ui/CLAUDE.md › Large screens).
  const listContentStyle = usePageContentStyle([pageListContentStyle, styles.list]);
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
    // `effectiveItemId` follows the overlay / server map, so rows get their new `added` state.
    [effectiveItemId, pending, toggle],
  );

  return (
    <Animated.FlatList
      {...page.listProps}
      data={f.isLoading || f.loadFailed ? [] : f.filtered}
      keyExtractor={listingKey}
      renderItem={renderListing}
      {...listWindowing}
      contentContainerStyle={page.contentStyle(listContentStyle)}
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={
        <View style={styles.listHeader}>
          {segments}
          <Input
            placeholder={t('collection.searchListingsPlaceholder')}
            value={f.search}
            onChangeText={f.setSearch}
            leftIconName="magnifying-glass"
            autoCorrect={false}
          />
        </View>
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
  );
}
