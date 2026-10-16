import { useRef, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { toast } from '@/ui';
import i18n from '@/i18n/config';
import { offersApi } from '@/lib/api';
import { qk, useAppMutation } from '@/lib/query';
import { useRefresh } from '@/hooks/useRefresh';
import { useAuthStore } from '@/stores/authStore';
import type { Offer } from '../_lib/types';
import { useTimingValues } from '@/hooks/useTimingPolicy';
import { useConfirmOffer } from '../../_hooks/useConfirmOffer';
import { statusColor } from '../_lib/status';
import { OFFER_INVALIDATES } from '../../_lib/invalidates';

/**
 * Offer-detail controller — owns the offer query, the accept/reject/cancel/
 * mutations (`useAppMutation`: toast + invalidate), the counter modal target (the modal
 * `CounterOfferModal` owns its form + mutation),
 * pull-to-refresh and derived flags. Lifted verbatim from the monolithic
 * orphan screen (§12); route-local (not merged into the list's offers/_lib).
 */
export function useOfferDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);

  // Karşı teklif modalı (`CounterOfferModal` — kendi formu + mutation'ı); null = kapalı.
  const [counterTarget, setCounterTarget] = useState<Offer | null>(null);
  // Onaylandı ama mutasyon bitmedi (diyalog kapanışı bitene dek ertelenmiş başlangıç dahil).
  // Onay basıldığı AN kurulur: butonlar devre dışı + spinner, ikinci basış ikinci işlem açmaz.
  const [confirmedKind, setConfirmedKind] = useState<'accept' | 'reject' | 'cancel' | null>(null);
  const confirmedRef = useRef<string | null>(null);
  const settle = () => {
    confirmedRef.current = null;
    setConfirmedKind(null);
  };

  const { data: offer, isLoading, error, refetch } = useQuery<Offer | null>({
    queryKey: qk.offers.detail(id ?? ''),
    queryFn: async () => {
      if (!id) return null;
      const response = await offersApi.getOne(id);
      return response.data?.data ?? response.data ?? null;
    },
    enabled: !!id,
  });

  const { refreshing, onRefresh } = useRefresh(refetch);
  const confirm = useConfirmOffer();
  const timing = useTimingValues();

  const acceptMutation = useAppMutation(() => offersApi.accept(id!), {
    invalidates: OFFER_INVALIDATES,
    success: () => i18n.t('offer.acceptedOrderCreated'),
    error: () => i18n.t('offer.acceptFailed'),
    mutation: { onSettled: settle },
  });

  const rejectMutation = useAppMutation(() => offersApi.reject(id!), {
    invalidates: OFFER_INVALIDATES,
    success: () => i18n.t('offer.offerRejected'),
    error: () => i18n.t('offer.rejectFailed'),
    mutation: { onSettled: settle },
  });

  const cancelMutation = useAppMutation(() => offersApi.cancel(id!), {
    invalidates: OFFER_INVALIDATES,
    error: () => i18n.t('offer.cancelFailed'),
    mutation: { onSettled: settle },
    // Önce geri dön, toast SONRA: toast kök katmanda olduğundan yeni ekranın üstünde görünür
    // (eski `appAlert` bir önceki ekranın üstünde açılıp "Tamam" bekletiyordu).
    onSuccess: () => {
      router.canGoBack() ? router.back() : router.replace('/(tabs)');
      toast.success(i18n.t('offer.offerCancelled'));
    },
  });

  const request = (
    confirmKind: Parameters<typeof confirm>[0],
    kind: 'accept' | 'reject' | 'cancel',
    run: () => void,
  ) => {
    if (confirmedRef.current) return; // onay bekleyen / süren işlem varken yenisi yok
    confirm(confirmKind, run, () => {
      confirmedRef.current = kind;
      setConfirmedKind(kind);
    });
  };
  /** Detaydan kabul yalnız satıcıdır (gelen teklif); web gibi önce onay. */
  const requestAccept = () => request('acceptSeller', 'accept', () => acceptMutation.mutate());
  /** Reddet / iptal: liste kartıyla aynı onay (`useConfirmOffer`). */
  const requestReject = () => request('reject', 'reject', () => rejectMutation.mutate());
  const requestCancel = () => request('cancel', 'cancel', () => cancelMutation.mutate());
  const accepting = acceptMutation.isPending || confirmedKind === 'accept';
  const rejecting = rejectMutation.isPending || confirmedKind === 'reject';
  const cancelling = cancelMutation.isPending || confirmedKind === 'cancel';

  const firstImg =
    Array.isArray(offer?.product?.images) && offer!.product!.images.length > 0
      ? typeof offer!.product!.images[0] === 'string'
        ? (offer!.product!.images[0] as string)
        : (offer!.product!.images[0] as any)?.cardUrl || (offer!.product!.images[0] as any)?.url
      : null;

  const isBuyer = !!offer && (user?.id === offer.buyer?.id || user?.id === offer.buyerId);
  const isSeller =
    !!offer &&
    (user?.id === offer.seller?.id ||
      user?.id === offer.sellerId ||
      user?.id === offer.product?.seller?.id);
  const isPending = offer?.status === 'pending';
  const color = offer ? statusColor(offer.status) : null;

  const openCounter = () => {
    if (offer) setCounterTarget(offer);
  };
  const closeCounter = () => setCounterTarget(null);

  return {
    offer,
    isLoading,
    error,
    refetch,
    refreshing,
    onRefresh,
    acceptMutation,
    requestAccept,
    requestReject,
    requestCancel,
    timing,
    rejectMutation,
    cancelMutation,
    accepting,
    rejecting,
    cancelling,
    counterTarget,
    closeCounter,
    firstImg,
    isBuyer,
    isSeller,
    isPending,
    color,
    openCounter,
  };
}

export type OfferDetailController = ReturnType<typeof useOfferDetail>;
