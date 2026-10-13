import { useCallback, useRef, useState } from 'react';
import i18n from '@/i18n/config';
import { offersApi } from '@/lib/api';
import { useAppMutation } from '@/lib/query';
import { OFFER_INVALIDATES } from '../_lib/invalidates';
import { useConfirmOffer } from './useConfirmOffer';
import { acceptKind, type AcceptAs, type OfferConfirmKind } from '../_lib/accept';

/**
 * Kabul / reddet / iptal mutation'ları — toast + invalidateQueries
 * sahibi (`useAppMutation`). Ekran manuel refetch etmez; liste otomatik tazelenir.
 *
 * `accept`/`reject`/`cancel` ONAYSIZ mutasyonlardır; kullanıcıya dönük akış `request*`tir
 * (web gibi önce onay diyaloğu; kabulde ödeme süresi + "ilk ödeyen alır"). Onay sonrası
 * mutasyon modal kapanma süresi kadar gecikir (ModalFreeze, bkz. `useConfirmOffer`).
 *
 * `pendingOfferIds`: o an işlemde olan tekliflerin id'leri (kart üzerinde spinner için). BİR SET:
 * birden çok teklif aynı anda bekleyebilir (A'nın kabulü sürerken B onaylanabilir). Bir teklif
 * onay basıldığı AN girer (mutasyon, diyalog kapanışı bitince başlar; arada kart boş kalıp ikinci
 * basışa izin vermesin) ve YALNIZ kendi mutasyonu bitince (`onSettled`, kendi id'siyle) çıkar:
 * başka teklifin bekleme durumu ne açılır ne temizlenir.
 */
export function useOfferActions() {
  const confirm = useConfirmOffer();
  // Onaylandı ama mutasyonu henüz bitmedi (ertelenmiş başlangıç dahil), teklif id'si başına.
  // Ref senkron guard (çift basış), state yeniden çizim için aynı kümenin kopyası.
  const pendingRef = useRef<Set<string>>(new Set());
  const [pendingOfferIds, setPendingOfferIds] = useState<ReadonlySet<string>>(() => new Set());
  const markPending = useCallback((id: string) => {
    if (pendingRef.current.has(id)) return;
    pendingRef.current.add(id);
    setPendingOfferIds(new Set(pendingRef.current));
  }, []);
  const settle = useCallback((id: string) => {
    if (!pendingRef.current.delete(id)) return;
    setPendingOfferIds(new Set(pendingRef.current));
  }, []);

  // Üç mutation aynı iskelet: bekleyen-id işaretleme + OFFER_INVALIDATES + toast (sonuç/hata).
  const useOfferMutation = (
    fn: (id: string) => Promise<unknown>,
    successKey: 'offer.offerAccepted' | 'offer.offerRejected' | 'offer.offerCancelled',
    errorKey: 'offer.acceptFailed' | 'offer.rejectFailed' | 'offer.cancelFailed',
  ) =>
    useAppMutation(fn, {
      invalidates: OFFER_INVALIDATES,
      success: () => i18n.t(successKey),
      error: () => i18n.t(errorKey),
      mutation: {
        onMutate: markPending, // doğrudan çağrı (onaysız) da bekliyor sayılır
        onSettled: (_data, _err, id) => settle(id),
      },
    });
  const accept = useOfferMutation((id) => offersApi.accept(id), 'offer.offerAccepted', 'offer.acceptFailed');
  const reject = useOfferMutation((id) => offersApi.reject(id), 'offer.offerRejected', 'offer.rejectFailed');
  const cancel = useOfferMutation((id) => offersApi.cancel(id), 'offer.offerCancelled', 'offer.cancelFailed');

  const acceptMutate = accept.mutate;
  const rejectMutate = reject.mutate;
  const cancelMutate = cancel.mutate;
  /** Aynı teklifte onay bekleyen / süren işlem varken yenisini başlatma (çift basış). */
  const request = useCallback(
    (id: string, kind: OfferConfirmKind, run: (id: string) => void) => {
      if (pendingRef.current.has(id)) return;
      confirm(
        kind,
        () => run(id),
        () => markPending(id),
      );
    },
    [confirm, markPending],
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

  return {
    accept: accept.mutate,
    requestAccept,
    requestReject,
    requestCancel,
    reject: reject.mutate,
    cancel: cancel.mutate,
    pendingOfferIds,
  };
}
