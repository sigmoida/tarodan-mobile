import { useMutation } from '@tanstack/react-query';
import { appAlert } from '@/ui';
import i18n from '@/i18n/config';
import { offersApi } from '@/lib/api';
import { formatApiErrorMessage } from '@/utils/formatApiErrorMessage';
import { useInvalidateOffers } from './useInvalidateOffers';

/** Satıcının karşı teklifi (CounterOfferModal sahiplenir). */
export function useDoCounterOffer() {
  const invalidate = useInvalidateOffers();
  return useMutation({
    mutationFn: ({ id, amount }: { id: string; amount: number }) =>
      offersApi.counter(id, amount),
    onSuccess: () => {
      invalidate();
      appAlert(i18n.t('common.success'), i18n.t('offer.counterSent'));
    },
    onError: (err) =>
      appAlert(i18n.t('common.error'), formatApiErrorMessage(err, i18n.t('offer.counterFailed'))),
  });
}
