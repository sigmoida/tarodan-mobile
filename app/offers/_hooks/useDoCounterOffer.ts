import i18n from '@/i18n/config';
import { offersApi } from '@/lib/api';
import { useAppMutation } from '@/lib/query';
import { OFFER_INVALIDATES } from '../_lib/invalidates';

/** Satıcının karşı teklifi (CounterOfferModal sahiplenir; modal KAPANDIKTAN sonra tetiklenir). */
export function useDoCounterOffer() {
  return useAppMutation(
    ({ id, amount }: { id: string; amount: number }) => offersApi.counter(id, amount),
    {
      invalidates: OFFER_INVALIDATES,
      success: () => i18n.t('offer.counterSent'),
      error: () => i18n.t('offer.counterFailed'),
    },
  );
}
