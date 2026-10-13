import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { styles } from '../_lib/styles';
import { RawText } from '@/ui';

/**
 * Kargo çıkış adresi ekleme/düzeltme istemi (web `AddressGate`): yalnız BİLİNEN eksikte.
 * Yükleniyor / okunamadı durumları `ListingRequirementGate` içinde tek loader / ErrorState.
 */
export function DispatchAddressPrompt({ needsFix }: { needsFix: boolean }) {
  const { t } = useTranslation();
  return (
    <View style={styles.ibanBanner}>
      <RawText style={styles.ibanBannerTitle}>
        {t(needsFix ? 'listing.dispatchAddressFixTitle' : 'listing.dispatchAddressRequiredTitle')}
      </RawText>
      <RawText style={styles.ibanBannerBody}>{t('address.dispatchPromptDesc')}</RawText>
      <TouchableOpacity
        style={styles.ibanBannerButton}
        onPress={() => router.push('/settings/addresses')}
      >
        <RawText style={styles.ibanBannerButtonText}>
          {t(needsFix ? 'address.dispatchFixButton' : 'address.dispatchAddButton')}
        </RawText>
      </TouchableOpacity>
    </View>
  );
}
