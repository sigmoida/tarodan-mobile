import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { styles } from '../_lib/styles';

/**
 * Kargo çıkış adresi ekleme/düzeltme istemi (web `AddressGate`): yalnız BİLİNEN eksikte.
 * Yükleniyor / okunamadı durumları `ListingRequirementGate` içinde tek loader / ErrorState.
 */
export function DispatchAddressPrompt({ needsFix }: { needsFix: boolean }) {
  const { t } = useTranslation();
  return (
    <View style={styles.ibanBanner}>
      <Text style={styles.ibanBannerTitle}>
        {t(needsFix ? 'listing.dispatchAddressFixTitle' : 'listing.dispatchAddressRequiredTitle')}
      </Text>
      <Text style={styles.ibanBannerBody}>{t('address.dispatchPromptDesc')}</Text>
      <TouchableOpacity
        style={styles.ibanBannerButton}
        onPress={() => router.push('/settings/addresses')}
      >
        <Text style={styles.ibanBannerButtonText}>
          {t(needsFix ? 'address.dispatchFixButton' : 'address.dispatchAddButton')}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
