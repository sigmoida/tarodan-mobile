import i18n from '@/i18n/config';
import { offersApi } from '@/lib/api';
import { useAppMutation } from '@/lib/query';
import { OFFER_INVALIDATES } from '../_lib/invalidates';

/** Alıcının (daha düşük) karşı teklifi (BuyerCounterModal sahiplenir; modal KAPANDIKTAN sonra tetiklenir). */
export function useDoBuyerCounter() {
  return useAppMutation(
    ({ id, amount }: { id: string; amount: number }) => offersApi.buyerCounter(id, amount),
    {
      invalidates: OFFER_INVALIDATES,
      success: () => i18n.t('offer.buyerCounterSent'),
      error: () => i18n.t('offer.counterFailed'),
    },
  );
}
