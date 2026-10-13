import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Button, theme, RawText, Icon } from '@/ui';
import { useTabBarInset } from '@/components/shell/tabBarLayout';
import { PageShell } from '@/components/common/PageShell';
import { goBackOrHome } from '@/components/common/goBackOrHome';

import { styles } from '../_lib/styles';
import type { ListingFormController } from '../_hooks/useListingForm';

const { colors } = theme;

/**
 * Kapı ekranlarının çerçevesi. Düzenleme modunda standart beyaz üst bar (`PageShell`: geri oku,
 * başlık sola, ortak yükseklik); oluşturma modu `sell` sekme kökünün (AppShell) içinde açılır, bu
 * yüzden yalnız ortalanmış gövde çizer.
 */
export function ListingGateFrame({ isEdit, children }: { isEdit: boolean; children: React.ReactNode }) {
  const { t } = useTranslation();
  const tabInset = useTabBarInset();
  if (!isEdit) {
    // Sekme kökünde yüzen hap var: ortalanan içerik hapın altına girmesin.
    return <View style={[styles.centered, { paddingBottom: tabInset }]}>{children}</View>;
  }
  const body = <View style={styles.centered}>{children}</View>;
  return (
    <PageShell title={t('product.editListing')} mode="static" padding={false}>
      {body}
    </PageShell>
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
    return (
      <ListingGateFrame isEdit={isEdit}>
        <ActivityIndicator size="large" color={colors.primary[600]!} />
      </ListingGateFrame>
    );
  }

  if (!isAuthenticated) {
    return (
      <ListingGateFrame isEdit={isEdit}>
        <RawText style={styles.authText}>{t('product.loginRequiredToCreate')}</RawText>
        <Button title={t('common.login')} onPress={() => router.push('/(auth)/login')} />
      </ListingGateFrame>
    );
  }

  if (isEdit && productNotFound) {
    return (
      <ListingGateFrame isEdit>
        <Icon name="exclamation-circle" size={64} color={colors.danger[600]!} />
        <RawText style={[styles.authText, { marginTop: theme.spacing[4] }]}>{t('product.listingNotFound')}</RawText>
        <Button title={t('common.goBack')} onPress={goBackOrHome} />
      </ListingGateFrame>
    );
  }

  if (isEdit && status === 'reserved') {
    return (
      <ListingGateFrame isEdit>
        <Icon name="lock-closed" size={56} color={colors.warning[600]!} />
        <RawText style={[styles.authText, { marginTop: theme.spacing[4] }]}>
          {t('listing.reservedCannotEdit')}
        </RawText>
      </ListingGateFrame>
    );
  }

  return null;
}
