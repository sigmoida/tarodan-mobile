import React from 'react';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { EmptyState } from '@/ui';
import { searchEntryHref } from '@/lib/navigation/searchHref';
import type { TabType } from '../_lib/types';

/** Empty offer list (the offers FlatList's `ListEmptyComponent`): copy depends on the tab; the action opens the listings. */
export function OffersEmpty({ tab }: { tab: TabType }) {
  const { t } = useTranslation();
  const received = tab === 'received';
  return (
    <EmptyState
      placement="list"
      icon={received ? 'envelope-open' : 'paper-airplane'}
      title={received ? t('offer.emptyReceivedTitle') : t('offer.emptySentTitle')}
      subtitle={received ? t('offer.emptyReceivedSubtitle') : t('offer.emptySentSubtitle')}
      actionLabel={t('mobile.guestBrowseListings')}
      onAction={() => router.push(searchEntryHref('all'))}
    />
  );
}
