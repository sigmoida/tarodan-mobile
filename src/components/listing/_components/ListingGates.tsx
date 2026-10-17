import React from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { EmptyState, ScreenLoader, type EmptyStateProps } from '@/ui';
import { useTabBarInset } from '@/components/shell/tabBarLayout';
import { PageShell } from '@/components/common/PageShell';
import { goBackOrHome } from '@/components/common/goBackOrHome';

import type { ListingFormController } from '../_hooks/useListingForm';

const goLogin = () => router.push('/(auth)/login');

/**
 * Kapı ekranlarının çerçevesi — standart durumlar (`ScreenLoader` / `EmptyState`).
 * Düzenleme: `PageShell` (`loading` → tam ekran spinner, `empty` → `EmptyState`; geri oku,
 * ortak üst bar). Oluşturma `sell` sekme kökünün (AppShell) içinde açılır: aynı durumları
 * doğrudan çizer, alt dolgu yüzen alt menü kadar.
 */
function ListingGateFrame({
  isEdit,
  loading,
  emptyState,
}: {
  isEdit: boolean;
  loading?: boolean;
  emptyState?: EmptyStateProps;
}) {
  const { t } = useTranslation();
  const tabInset = useTabBarInset();
  if (isEdit) {
    return (
      <PageShell
        title={t('product.editListing')}
        mode="static"
        padding={false}
        loading={loading}
        loadingVariant="spinner"
        empty={!!emptyState}
        emptyState={emptyState}
      />
    );
  }
  return (
    <View style={[styles.tabRoot, { paddingBottom: tabInset }]}>
      {loading ? <ScreenLoader /> : emptyState ? <EmptyState {...emptyState} /> : null}
    </View>
  );
}

/**
 * Renders the appropriate loading / auth / not-found / reserved gate for the
 * form, or `null` when the form itself should render. Keeps the early-return
 * ladder out of the thin screen.
 */
export function ListingGates({ f }: { f: ListingFormController }) {
  const { t } = useTranslation();
  const { authLoading, isEdit, productLoading, isAuthenticated, productNotFound, status } = f;

  if (authLoading || (isEdit && productLoading)) {
    return <ListingGateFrame isEdit={isEdit} loading />;
  }

  if (!isAuthenticated) {
    return (
      <ListingGateFrame
        isEdit={isEdit}
        emptyState={{
          icon: 'user',
          title: t('membership.loginRequiredTitle'),
          subtitle: t('product.loginRequiredToCreate'),
          actionLabel: t('common.login'),
          onAction: goLogin,
          testID: 'listing-gate-login',
        }}
      />
    );
  }

  if (isEdit && productNotFound) {
    return (
      <ListingGateFrame
        isEdit
        emptyState={{
          icon: 'exclamation-circle',
          title: t('product.listingNotFound'),
          subtitle: t('emptyState.notFoundHint'),
          actionLabel: t('common.goBack'),
          onAction: goBackOrHome,
          testID: 'listing-gate-not-found',
        }}
      />
    );
  }

  if (isEdit && status === 'reserved') {
    return (
      <ListingGateFrame
        isEdit
        emptyState={{
          icon: 'lock-closed',
          title: t('product.productReserved'),
          subtitle: t('listing.reservedCannotEdit'),
          testID: 'listing-gate-reserved',
        }}
      />
    );
  }

  return null;
}

const styles = StyleSheet.create({
  tabRoot: {
    flex: 1,
  },
});
