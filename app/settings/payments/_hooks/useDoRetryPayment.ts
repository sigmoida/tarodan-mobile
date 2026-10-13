import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { appAlert } from '@/ui';
import { paymentsApi } from '@/lib/api';
import { qk } from '@/lib/query';
import { useRequireLegalIdentity } from '@/hooks/useLegalIdentity';

/**
 * Başarısız ödemeyi yeniden deneme (CLAUDE.md §6 mutasyon hook'u).
 *
 * Akış: yasal kimlik (B4) → onay penceresi → `POST /payments/:id/retry`.
 * Kimlik ONAYDAN ÖNCE: `appAlert` kapanırken native kapı açılırsa iOS donar.
 *
 * Kart başına durum `useState` DEĞİL, mutasyonların `variables`'ından (§12):
 * - `checkingId`: kimliği kontrol edilen ödeme (yalnız kontrol gerçekten ağa
 *   / kapıya gittiyse — önbellek "tamam" ise titreme yok),
 * - `retryingId`: retry isteği uçuşta olan ödeme.
 * Herhangi biri sürerken `busy` → diğer kartların "Tekrar Dene"si devre dışı,
 * ikinci basış yok sayılır (değişken üzerine yazılıp spinner başka karta
 * kaymasın diye senkron ref koruması da var — aynı render içindeki çift basış).
 */
export function useDoRetryPayment(notify: (message: string) => void) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { requireIdentity, isChecking } = useRequireLegalIdentity();
  const starting = useRef(false);

  const identity = useMutation({
    mutationFn: (_paymentId: string) => requireIdentity(),
  });

  const retry = useMutation({
    mutationFn: async (paymentId: string) => {
      const response: any = await paymentsApi.retry(paymentId);
      return (response?.data?.paymentUrl ?? response?.data?.data?.paymentUrl) as string | undefined;
    },
    onSuccess: (url, paymentId) => {
      if (url) {
        router.push({ pathname: '/payment/[id]', params: { id: paymentId, paymentUrl: url } } as any);
        return;
      }
      notify(t('payment.retryStarted'));
      void queryClient.invalidateQueries({ queryKey: qk.payments.mine });
    },
    onError: (e: any) => {
      appAlert(t('common.error'), e?.response?.data?.message || t('payment.retryFailed'));
    },
  });

  const busy = identity.isPending || retry.isPending;

  const start = async (paymentId: string) => {
    if (starting.current || busy) return;
    starting.current = true;
    let ok = false;
    try {
      ok = await identity.mutateAsync(paymentId);
    } catch {
      ok = false;
    } finally {
      starting.current = false;
    }
    if (!ok) return;
    appAlert(t('payment.retryTitle'), t('payment.retryConfirm'), [
      { text: t('discount.discard'), style: 'cancel' },
      { text: t('common.continueShort'), onPress: () => retry.mutate(paymentId) },
    ]);
  };

  const checkingId = identity.isPending && isChecking ? (identity.variables ?? null) : null;
  const retryingId = retry.isPending ? (retry.variables ?? null) : null;

  return {
    start,
    busy,
    /** Spinner'ın gösterileceği kart (kimlik kontrolü ya da retry isteği). */
    pendingId: checkingId ?? retryingId,
  };
}
