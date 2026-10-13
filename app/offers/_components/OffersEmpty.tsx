import React from 'react';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { EmptyState } from '@/ui';
import type { TabType } from '../_lib/types';

/** Boş teklif listesi — metni sekmeye göre değişir; eylem ilanlara götürür. */
export function OffersEmpty({ tab }: { tab: TabType }) {
  const { t } = useTranslation();
  const received = tab === 'received';
  return (
    <EmptyState
      icon={received ? 'mail-open-outline' : 'paper-plane-outline'}
      title={received ? t('offer.emptyReceivedTitle') : t('offer.emptySentTitle')}
      description={received ? t('offer.emptyReceivedSubtitle') : t('offer.emptySentSubtitle')}
      actionLabel={t('mobile.guestBrowseListings')}
      onAction={() => router.push('/listings')}
    />
  );
}
