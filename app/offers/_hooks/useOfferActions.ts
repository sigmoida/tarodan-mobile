import { useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { appAlert } from '@/ui';
import i18n from '@/i18n/config';
import { offersApi } from '@/lib/api';
import { formatApiErrorMessage } from '@/utils/formatApiErrorMessage';
import { useInvalidateOffers } from './useInvalidateOffers';
import { useConfirmOffer } from './useConfirmOffer';
import { acceptKind, type AcceptAs } from '../_lib/accept';

/**
 * Kabul / reddet / iptal mutation'ları — snackbar (appAlert) + invalidateQueries
 * sahibi. Ekran manuel refetch etmez; liste otomatik tazelenir.
 *
 * `accept`/`reject`/`cancel` ONAYSIZ mutasyonlardır; kullanıcıya dönük akış `request*`tir
 * (web gibi önce onay diyaloğu; kabulde ödeme süresi + "ilk ödeyen alır"). Onay sonrası
 * mutasyon modal kapanma süresi kadar gecikir (ModalFreeze, bkz. `useConfirmOffer`).
 *
 * `pendingOfferId`: o an işlemde olan teklifin id'si (kart üzerinde spinner için).
 */
export function useOfferActions() {
  const invalidate = useInvalidateOffers();
  const confirm = useConfirmOffer();

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
  const rejectMutate = reject.mutate;
  const cancelMutate = cancel.mutate;
  const requestAccept = useCallback(
    (id: string, as: AcceptAs) => confirm(acceptKind(as), () => acceptMutate(id)),
    [confirm, acceptMutate],
  );
  const requestReject = useCallback(
    (id: string) => confirm('reject', () => rejectMutate(id)),
    [confirm, rejectMutate],
  );
  const requestCancel = useCallback(
    (id: string) => confirm('cancel', () => cancelMutate(id)),
    [confirm, cancelMutate],
  );

  const pendingOfferId =
    (accept.isPending && accept.variables) ||
    (reject.isPending && reject.variables) ||
    (cancel.isPending && cancel.variables) ||
    null;

  return {
    accept: accept.mutate,
    requestAccept,
    requestReject,
    requestCancel,
    reject: reject.mutate,
    cancel: cancel.mutate,
    pendingOfferId,
  };
}
