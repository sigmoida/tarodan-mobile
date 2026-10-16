import React from 'react';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { PageShell } from '@/components/common/PageShell';
import { useAuthStore } from '@/stores/authStore';

/**
 * Auth + seller gate for the discount screens (list, new, edit, product picker),
 * or `null` when the screen itself should render. Matches the web parity rules.
 * Called as a plain function before the screen's own early returns (hook order
 * stays stable: its hooks always run).
 */
export function DiscountsGate({ title }: { title?: string } = {}) {
  const { t } = useTranslation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const barTitle = title ?? t('discount.myDiscountsTitle');

  if (!isAuthenticated) {
    return (
      <PageShell
        title={barTitle}
        empty
        emptyState={{
          icon: 'lock-closed',
          title: t('listing.loginRequiredTitle'),
          subtitle: t('discount.loginRequiredBody'),
          actionLabel: t('common.login'),
          onAction: () => router.push('/(auth)/login'),
        }}
      />
    );
  }

  if (user && user.isSeller === false) {
    return (
      <PageShell
        title={barTitle}
        empty
        emptyState={{
          icon: 'building-storefront',
          title: t('discount.sellerRequiredTitle'),
          subtitle: t('discount.sellerRequiredBody'),
          actionLabel: t('discount.becomeSeller'),
          onAction: () => router.push('/seller/register'),
        }}
      />
    );
  }

  return null;
}
