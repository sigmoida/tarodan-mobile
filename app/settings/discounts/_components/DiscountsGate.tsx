import React from 'react';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { PageShell } from '@/components/common/PageShell';

import type { DiscountsController } from '../_hooks/useDiscounts';

/**
 * Auth + seller gate for the discounts screen, or `null` when the screen itself
 * should render. Matches the web parity rules (checked after hooks run).
 */
export function DiscountsGate({ f }: { f: DiscountsController }) {
  const { t } = useTranslation();
  const title = t('discount.myDiscountsTitle');

  if (!f.isAuthenticated) {
    return (
      <PageShell
        title={title}
        empty
        emptyState={{
          icon: 'lock-closed',
          title: t('listing.loginRequiredTitle'),
          subtitle: t('discount.loginRequiredBody'),
          actionLabel: t('common.login'),
          onAction: () => router.push('/(auth)/login' as any),
        }}
      />
    );
  }

  if (f.user && f.user.isSeller === false) {
    return (
      <PageShell
        title={title}
        empty
        emptyState={{
          icon: 'building-storefront',
          title: t('discount.sellerRequiredTitle'),
          subtitle: t('discount.sellerRequiredBody'),
          actionLabel: t('discount.becomeSeller'),
          onAction: () => router.push('/seller/register' as any),
        }}
      />
    );
  }

  return null;
}
