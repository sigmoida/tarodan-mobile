import React from 'react';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { RequirementPrompt } from './RequirementPrompt';

const goAddresses = () => router.push('/settings/addresses');

/**
 * Kargo çıkış adresi ekleme/düzeltme istemi (web `AddressGate`): yalnız BİLİNEN eksikte.
 * Yükleniyor / okunamadı durumları `ListingRequirementGate` içinde tek loader / ErrorState.
 */
export function DispatchAddressPrompt({ needsFix }: { needsFix: boolean }) {
  const { t } = useTranslation();
  return (
    <RequirementPrompt
      testID="listing-address-prompt"
      title={t(needsFix ? 'listing.dispatchAddressFixTitle' : 'listing.dispatchAddressRequiredTitle')}
      body={t('address.dispatchPromptDesc')}
      actionLabel={t(needsFix ? 'address.dispatchFixButton' : 'address.dispatchAddButton')}
      onAction={goAddresses}
    />
  );
}
