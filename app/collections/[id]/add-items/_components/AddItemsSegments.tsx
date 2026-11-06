import React from 'react';
import { useTranslation } from 'react-i18next';
import { SegmentedButtons } from '@/ui';

export type AddItemsSegment = 'listings' | 'custom';

/**
 * The two ways to add to a collection, like the web modal's tabs: the owner's listings
 * (`collection.myListings`) or a custom item (`collection.customProduct`).
 */
export function AddItemsSegments({
  value,
  onChange,
}: {
  value: AddItemsSegment;
  onChange: (value: AddItemsSegment) => void;
}) {
  const { t } = useTranslation();
  return (
    <SegmentedButtons<AddItemsSegment>
      value={value}
      onValueChange={onChange}
      options={[
        { value: 'listings', label: t('collection.myListings') },
        { value: 'custom', label: t('collection.customProduct') },
      ]}
    />
  );
}
