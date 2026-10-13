import { useCallback, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { appAlert } from '@/ui';
import i18n from '@/i18n/config';
import { offersApi } from '@/lib/api';
import { formatApiErrorMessage } from '@/utils/formatApiErrorMessage';
import { useInvalidateOffers } from './useInvalidateOffers';
import { useConfirmOffer } from './useConfirmOffer';
import { acceptKind, type AcceptAs, type OfferConfirmKind } from '../_lib/accept';

/**
 * Kabul / reddet / iptal mutation'ları — snackbar (appAlert) + invalidateQueries
 * sahibi. Ekran manuel refetch etmez; liste otomatik tazelenir.
 *
 * `accept`/`reject`/`cancel` ONAYSIZ mutasyonlardır; kullanıcıya dönük akış `request*`tir
 * (web gibi önce onay diyaloğu; kabulde ödeme süresi + "ilk ödeyen alır"). Onay sonrası
 * mutasyon modal kapanma süresi kadar gecikir (ModalFreeze, bkz. `useConfirmOffer`).
 *
 * `pendingOfferId`: o an işlemde olan teklifin id'si (kart üzerinde spinner için). Onay
 * basıldığı AN kurulur (mutasyon, diyalog kapanışı bitince başlar; arada kart boş kalıp ikinci
 * basışa izin vermesin) ve mutasyon bitince (`onSettled`) kalkar.
 */
export function useOfferActions() {
  const invalidate = useInvalidateOffers();
  const confirm = useConfirmOffer();
  // Onaylandı ama mutasyon henüz bitmedi (ertelenmiş başlangıç dahil).
  const [confirmedId, setConfirmedId] = useState<string | null>(null);
  const confirmedRef = useRef<string | null>(null);
  const settle = useCallback(() => {
    confirmedRef.current = null;
    setConfirmedId(null);
  }, []);

  const accept = useMutation({
    mutationFn: (id: string) => offersApi.accept(id),
    onSettled: settle,
    onSuccess: () => {
      invalidate();
      appAlert(i18n.t('common.success'), i18n.t('offer.offerAccepted'));
    },
    onError: (err) =>
      appAlert(i18n.t('common.error'), formatApiErrorMessage(err, i18n.t('offer.acceptFailed'))),
  });

  const reject = useMutation({
    mutationFn: (id: string) => offersApi.reject(id),
    onSettled: settle,
    onSuccess: () => {
      invalidate();
      appAlert(i18n.t('common.success'), i18n.t('offer.offerRejected'));
    },
    onError: (err) =>
      appAlert(i18n.t('common.error'), formatApiErrorMessage(err, i18n.t('offer.rejectFailed'))),
  });

  const cancel = useMutation({
    mutationFn: (id: string) => offersApi.cancel(id),
    onSettled: settle,
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
  /** Aynı teklifte onay bekleyen / süren işlem varken yenisini başlatma (çift basış). */
  const request = useCallback(
    (id: string, kind: OfferConfirmKind, run: (id: string) => void) => {
      if (confirmedRef.current === id) return;
      confirm(
        kind,
        () => run(id),
        () => {
          confirmedRef.current = id;
          setConfirmedId(id);
        },
      );
    },
    [confirm],
  );
  const requestAccept = useCallback(
    (id: string, as: AcceptAs) => request(id, acceptKind(as), acceptMutate),
    [request, acceptMutate],
  );
  const requestReject = useCallback(
    (id: string) => request(id, 'reject', rejectMutate),
    [request, rejectMutate],
  );
  const requestCancel = useCallback(
    (id: string) => request(id, 'cancel', cancelMutate),
    [request, cancelMutate],
  );

  const pendingOfferId =
    confirmedId ||
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
