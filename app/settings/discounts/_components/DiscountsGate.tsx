import React from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { EmptyState } from '@/ui';
import { ScreenHeader } from '@/components/common';

import { styles } from '../_lib/styles';
import type { DiscountsController } from '../_hooks/useDiscounts';

/**
 * Auth + seller gate for the discounts screen, or `null` when the screen itself
 * should render. Matches the web parity rules (checked after hooks run).
 */
export function DiscountsGate({ f }: { f: DiscountsController }) {
  const { t } = useTranslation();

  if (!f.isAuthenticated) {
    return (
      <View style={styles.gateContainer}>
        <ScreenHeader title={t('discount.myDiscountsTitle')} />
        <EmptyState
          icon="lock-closed-outline"
          title={t('listing.loginRequiredTitle')}
          subtitle={t('discount.loginRequiredBody')}
          actionLabel={t('common.login')}
          onAction={() => router.push('/(auth)/login' as any)}
        />
      </View>
    );
  }

  if (f.user && f.user.isSeller === false) {
    return (
      <View style={styles.gateContainer}>
        <ScreenHeader title={t('discount.myDiscountsTitle')} />
        <EmptyState
          icon="storefront-outline"
          title={t('discount.sellerRequiredTitle')}
          subtitle={t('discount.sellerRequiredBody')}
          actionLabel={t('discount.becomeSeller')}
          onAction={() => router.push('/seller/register' as any)}
        />
      </View>
    );
  }

  return null;
}
