import React from 'react';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { BANK_ACCOUNT_FROM_LISTING_HREF } from '../_lib/gates';
import { RequirementPrompt } from './RequirementPrompt';

const goBankAccount = () => router.push(BANK_ACCOUNT_FROM_LISTING_HREF);

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
