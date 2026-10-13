import React from 'react';
import { ErrorState } from '@/ui';

import { listingGateView } from '../_lib/gates';
import type { ListingFormController } from '../_hooks/useListingForm';
import { BankAccountPrompt } from './BankAccountPrompt';
import { DispatchAddressPrompt } from './DispatchAddressPrompt';
import { GateLoading } from './GateLoading';

/**
 * Yeni ilan ön koşul kapısı: banka hesabı (IBAN) + kargo çıkış adresi, TEK bileşen.
 * Önceki iki ayrı kapı aynı anda yüklenince iki loader, aynı anda hata verince iki
 * ErrorState gösteriyordu. Şimdi birleşik görünüm (`listingGateView`):
 *  - herhangi biri okunamadı -> TEK `ErrorState`; "Tekrar Dene" hatalı OLAN HER sorguyu
 *    birlikte yeniden çeker (bilinmeyen durum "eksik" sayılmaz, "ekle" denmez),
 *  - değilse herhangi biri yükleniyor -> TEK loader,
 *  - değilse bilinen eksikler için ekleme istemleri (IBAN, adres; ikisi de yoksa alt alta),
 *  - ikisi de açıksa (ya da düzenleme) `null`; ekran formu gösterir.
 *
 * Sapma (kullanıcı kararı): web okuma hatasında da "IBAN ekle" der (hesap yok sayar);
 * mobil ErrorState + yeniden dene gösterir.
 */
export function ListingRequirementGate({ f }: { f: ListingFormController }) {
  const { view, bank, address } = listingGateView(f);

  if (view === 'open') return null;
  if (view === 'loading') return <GateLoading />;

  if (view === 'error') {
    const retry = () => {
      if (bank === 'error') f.refetchBankAccount();
      if (address === 'error') f.refetchDispatchAddress();
    };
    return <ErrorState onRetry={retry} />;
  }

  return (
    <>
      {bank === 'missing' ? <BankAccountPrompt /> : null}
      {address === 'missing' ? <DispatchAddressPrompt needsFix={f.dispatchAddressNeedsFix} /> : null}
    </>
  );
}
