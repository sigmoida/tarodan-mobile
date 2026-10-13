import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ErrorState, theme } from '@/ui';

import { styles } from '../_lib/styles';
import type { ListingFormController } from '../_hooks/useListingForm';

/**
 * Kargo çıkış adresi kapısı (web `AddressGate` + `canCreateListing`): yeni ilan
 * formu adres geçerli olana kadar GÖSTERİLMEZ. Üç durum:
 * - yükleniyor -> loader (adres bilinmiyorken "adres ekle" denmez),
 * - okunamadı -> `ErrorState` + yeniden dene (bilinmeyen durum "eksik" sayılmaz),
 * - kayıt yok/kullanılamaz -> adres ekleme/düzeltme istemi.
 * Kapı açıksa (ya da düzenleme) `null` döner; ekran formu gösterir.
 */
export function dispatchGateBlocks(
  f: Pick<ListingFormController, 'isEdit' | 'hasDispatchAddress'>,
): boolean {
  return !f.isEdit && !f.hasDispatchAddress;
}

export function DispatchAddressGate({ f }: { f: ListingFormController }) {
  const { t } = useTranslation();
  if (!dispatchGateBlocks(f)) return null;

  if (f.dispatchAddressLoading) {
    return (
      <View style={styles.limitsPlaceholder}>
        <ActivityIndicator size="small" color={theme.colors.primary[600]!} />
      </View>
    );
  }

  if (f.dispatchAddressError) {
    return <ErrorState onRetry={f.refetchDispatchAddress} />;
  }

  return (
    <View style={styles.ibanBanner}>
      <Text style={styles.ibanBannerTitle}>
        {t(
          f.dispatchAddressNeedsFix
            ? 'listing.dispatchAddressFixTitle'
            : 'listing.dispatchAddressRequiredTitle',
        )}
      </Text>
      <Text style={styles.ibanBannerBody}>{t('address.dispatchPromptDesc')}</Text>
      <TouchableOpacity
        style={styles.ibanBannerButton}
        onPress={() => router.push('/settings/addresses')}
      >
        <Text style={styles.ibanBannerButtonText}>
          {t(f.dispatchAddressNeedsFix ? 'address.dispatchFixButton' : 'address.dispatchAddButton')}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
