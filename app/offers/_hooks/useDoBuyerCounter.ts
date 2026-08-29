import { useMutation } from '@tanstack/react-query';
import { appAlert } from '@/ui';
import i18n from '@/i18n/config';
import { offersApi } from '@/lib/api';
import { formatApiErrorMessage } from '@/utils/formatApiErrorMessage';
import { useInvalidateOffers } from './useInvalidateOffers';

/** Alıcının (daha düşük) karşı teklifi (BuyerCounterModal sahiplenir). */
export function useDoBuyerCounter() {
  const invalidate = useInvalidateOffers();
  return useMutation({
    mutationFn: ({ id, amount }: { id: string; amount: number }) =>
      offersApi.buyerCounter(id, amount),
    onSuccess: () => {
      invalidate();
      appAlert(i18n.t('common.success'), i18n.t('offer.buyerCounterSent'));
    },
    onError: (err) =>
      appAlert(i18n.t('common.error'), formatApiErrorMessage(err, i18n.t('offer.counterFailed'))),
  });
}
