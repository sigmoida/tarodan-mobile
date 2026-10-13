import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { styles } from '../_lib/styles';
import { RawText } from '@/ui';

/**
 * "Banka hesabı ekleyin" istemi (web `BankGate`): yalnız BİLİNEN eksikte gösterilir.
 * Yükleniyor / okunamadı durumları `ListingRequirementGate` içinde, iki kapı için tek
 * loader / ErrorState olarak ele alınır.
 */
export function BankAccountPrompt() {
  const { t } = useTranslation();
  return (
    <View style={styles.ibanBanner}>
      <RawText style={styles.ibanBannerTitle}>{t('listing.bankAccountBannerTitle')}</RawText>
      <RawText style={styles.ibanBannerBody}>{t('listing.bankAccountBannerBody')}</RawText>
      <TouchableOpacity
        style={styles.ibanBannerButton}
        onPress={() => router.push('/settings/bank-account')}
      >
        <RawText style={styles.ibanBannerButtonText}>{t('listing.addIban')}</RawText>
      </TouchableOpacity>
    </View>
  );
}
