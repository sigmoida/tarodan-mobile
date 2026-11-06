import { useState } from 'react';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Button, usePageScrollHandler } from '@/ui';
import { PageShell } from '@/components/common/PageShell';
import { useAddItems } from './_hooks/useAddItems';
import { useAddCustomItem } from './_hooks/useAddCustomItem';
import { AddItemsSegments, type AddItemsSegment } from './_components/AddItemsSegments';
import { ListingsPicker } from './_components/ListingsPicker';
import { CustomItemForm } from './_components/CustomItemForm';

/**
 * Add to a collection (web `AddItemModal`): two segments, "My listings" (pick listings, optimistic
 * add / remove in `useAddItems`) and "Custom product" (a model that is not a listing, `useAddCustomItem`).
 * Both controllers live here so switching segments keeps what was typed.
 */
export default function AddCollectionItemsScreen() {
  const { t } = useTranslation();
  const [segment, setSegment] = useState<AddItemsSegment>('listings');
  const listings = useAddItems();
  const custom = useAddCustomItem();
  const page = usePageScrollHandler();

  // Like web, the segment cannot change while the item is being added.
  const segments = (
    <AddItemsSegments value={segment} onChange={(next) => !custom.isPending && setSegment(next)} />
  );
  const isCustom = segment === 'custom';

  return (
    <PageShell
      title={t('collection.addProduct')}
      mode={isCustom ? 'scroll' : 'list'}
      scroll={isCustom ? undefined : page}
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
      footer={
        isCustom ? (
          <Button
            testID="custom-item-submit"
            size="lg"
            title={t('common.add')}
            onPress={custom.submit}
            isLoading={custom.isPending}
            disabled={custom.isPending}
            fullWidth
          />
        ) : undefined
      }
    >
      {isCustom ? (
        <>
          {segments}
          <CustomItemForm c={custom} />
        </>
      ) : (
        <ListingsPicker f={listings} page={page} segments={segments} />
      )}
    </PageShell>
  );
}
