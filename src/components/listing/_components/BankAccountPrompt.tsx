import React from 'react';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { RequirementPrompt } from './RequirementPrompt';

const goBankAccount = () => router.push('/settings/bank-account');

/**
 * "Banka hesabı ekleyin" istemi (web `BankGate`): yalnız BİLİNEN eksikte gösterilir.
 * Yükleniyor / okunamadı durumları `ListingRequirementGate` içinde, iki kapı için tek
 * loader / ErrorState olarak ele alınır.
 */
export function BankAccountPrompt() {
  const { t } = useTranslation();
  return (
    <RequirementPrompt
      testID="listing-bank-prompt"
      title={t('listing.bankAccountBannerTitle')}
      body={t('listing.bankAccountBannerBody')}
      actionLabel={t('listing.addIban')}
      onAction={goBankAccount}
    />
  );
}
