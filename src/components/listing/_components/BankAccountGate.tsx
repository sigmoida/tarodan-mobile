import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ErrorState } from '@/ui';

import { styles } from '../_lib/styles';
import type { ListingFormController } from '../_hooks/useListingForm';
import { GateLoading } from './GateLoading';

/**
 * IBAN kapısı (web `BankGate`): yeni ilan formu banka hesabı olana kadar
 * GÖSTERİLMEZ (eskiden yalnız gönderimde uyarılıyordu). `DispatchAddressGate`
 * ile aynı üç durum:
 * - yükleniyor -> loader (hesap bilinmiyorken "IBAN ekle" denmez),
 * - okunamadı -> `ErrorState` + yeniden dene (bilinmeyen durum "eksik" sayılmaz),
 * - hesap yok -> IBAN ekleme istemi.
 * Kapı açıksa (ya da düzenleme) `null` döner; ekran formu gösterir.
 */
export function bankGateBlocks(f: Pick<ListingFormController, 'isEdit' | 'hasBankAccount'>): boolean {
  return !f.isEdit && !f.hasBankAccount;
}

export function BankAccountGate({ f }: { f: ListingFormController }) {
  const { t } = useTranslation();
  if (!bankGateBlocks(f)) return null;

  if (f.bankAccountLoading) return <GateLoading />;

  if (f.bankAccountError) {
    return <ErrorState onRetry={f.refetchBankAccount} />;
  }

  return (
    <View style={styles.ibanBanner}>
      <Text style={styles.ibanBannerTitle}>{t('listing.bankAccountBannerTitle')}</Text>
      <Text style={styles.ibanBannerBody}>{t('listing.bankAccountBannerBody')}</Text>
      <TouchableOpacity
        style={styles.ibanBannerButton}
        onPress={() => router.push('/settings/bank-account')}
      >
        <Text style={styles.ibanBannerButtonText}>{t('listing.addIban')}</Text>
      </TouchableOpacity>
    </View>
  );
}
