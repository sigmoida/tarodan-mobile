import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { appAlert } from '@/ui';
import { useTimingValues } from '@/hooks/useTimingPolicy';
import { ACCEPT_CONFIRM_KEYS, type AcceptAs } from '../_lib/accept';

/**
 * Teklifi kabul etmeden ÖNCE onay (web `useOffers.run` + `useConfirm`): ödeme
 * süresi politikadan (`orderPaymentWindowHours`), "ilk ödeyen alır" uyarısıyla.
 * `appAlert` onay düğmesine basılınca önce kapanır, `onConfirm` ondan sonra
 * çalışır; kabul mutasyonunun sonuç uyarısı açık bir diyalogla çakışmaz (ModalFreeze).
 */
export function useConfirmAccept() {
  const { t } = useTranslation();
  const timing = useTimingValues();

  return useCallback(
    (as: AcceptAs, onConfirm: () => void) => {
      const keys = ACCEPT_CONFIRM_KEYS[as];
      appAlert(t(keys.title), t(keys.description, timing), [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.confirm'), onPress: onConfirm },
      ]);
    },
    [t, timing],
  );
}
