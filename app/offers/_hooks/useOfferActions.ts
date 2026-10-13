import { useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { appAlert } from '@/ui';
import i18n from '@/i18n/config';
import { offersApi } from '@/lib/api';
import { formatApiErrorMessage } from '@/utils/formatApiErrorMessage';
import { useInvalidateOffers } from './useInvalidateOffers';
import { useConfirmAccept } from './useConfirmAccept';
import type { AcceptAs } from '../_lib/accept';

/**
 * Kabul / reddet / iptal mutation'ları — snackbar (appAlert) + invalidateQueries
 * sahibi. Ekran manuel refetch etmez; liste otomatik tazelenir.
 *
 * `accept` ONAYSIZ kabuldür; kullanıcıya dönük akış `requestAccept`tir (web gibi önce
 * onay diyaloğu: ödeme süresi + "ilk ödeyen alır"). 
 *
 * `pendingOfferId`: o an işlemde olan teklifin id'si (kart üzerinde spinner için).
 */
export function useOfferActions() {
  const invalidate = useInvalidateOffers();
  const confirmAccept = useConfirmAccept();

  const accept = useMutation({
    mutationFn: (id: string) => offersApi.accept(id),
    onSuccess: () => {
      invalidate();
      appAlert(i18n.t('common.success'), i18n.t('offer.offerAccepted'));
    },
    onError: (err) =>
      appAlert(i18n.t('common.error'), formatApiErrorMessage(err, i18n.t('offer.acceptFailed'))),
  });

  const reject = useMutation({
    mutationFn: (id: string) => offersApi.reject(id),
    onSuccess: () => {
      invalidate();
      appAlert(i18n.t('common.success'), i18n.t('offer.offerRejected'));
    },
    onError: (err) =>
      appAlert(i18n.t('common.error'), formatApiErrorMessage(err, i18n.t('offer.rejectFailed'))),
  });

  const cancel = useMutation({
    mutationFn: (id: string) => offersApi.cancel(id),
    onSuccess: () => {
      invalidate();
      appAlert(i18n.t('common.success'), i18n.t('offer.offerCancelled'));
    },
    onError: (err) =>
      appAlert(i18n.t('common.error'), formatApiErrorMessage(err, i18n.t('offer.cancelFailed'))),
  });

  const acceptMutate = accept.mutate;
  const requestAccept = useCallback(
    (id: string, as: AcceptAs) => confirmAccept(as, () => acceptMutate(id)),
    [confirmAccept, acceptMutate],
  );

  const pendingOfferId =
    (accept.isPending && accept.variables) ||
    (reject.isPending && reject.variables) ||
    (cancel.isPending && cancel.variables) ||
    null;

  return {
    accept: accept.mutate,
    requestAccept,
    reject: reject.mutate,
    cancel: cancel.mutate,
    pendingOfferId,
  };
}
