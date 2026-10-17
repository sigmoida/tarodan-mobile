import { useQuery } from '@tanstack/react-query';
import { consentsApi } from '@/lib/api';
import { qk, retryUnlessClientError } from '@/lib/query';
import { requiredStepState } from '@/lib/requiredSteps';
import type { PendingConsent } from '@/lib/shared/legalConsent';
import { useAuthStore } from '@/stores/authStore';
import { useRefetchOnForeground } from './useRefetchOnForeground';

const EMPTY: PendingConsent[] = [];

/**
 * Yeniden-onay kapısının verisi (web `usePendingConsents`): üyenin onaylaması
 * gereken zorunlu belgeler. Kimin bekletileceğine sunucu karar verir (hiç
 * kaydı olmayan eski üye, Apple/Google ile açılan hesap, metni güncellenen
 * belge). Misafirde sorgu çalışmaz, liste boştur.
 *
 * Ne zaman sorulur: giriş (oturum açılınca sorgu etkinleşir), soğuk açılış
 * (`loadToken` bitince) ve uygulama ön plana her geldiğinde — metin uygulama
 * arka plandayken güncellenmiş olabilir (`useRefetchOnForeground`).
 *
 * Yalnız OKUMA: onay yazma yolu `useDoAcceptConsents` (kapı onu kullanır).
 */
export function usePendingConsents() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  const enabled = isAuthenticated && !isLoading;

  const query = useQuery({
    queryKey: qk.consents.pending,
    queryFn: async () => (await consentsApi.getPending()).data?.pending ?? [],
    enabled,
    // 4xx tekrar denenmez; hata kapıyı açık bırakır (fail-open, sunucu zorlamıyor).
    retry: retryUnlessClientError,
  });

  // Ön plana dönüşte yalnız BU sorgu yenilenir (global focusManager değil).
  useRefetchOnForeground(qk.consents.pending, { enabled });

  const pending = enabled ? (query.data ?? EMPTY) : EMPTY;
  const state = requiredStepState({
    enabled,
    isPending: query.isPending,
    needed: pending.length > 0,
  });

  return { pending, state };
}

export type PendingConsentsController = ReturnType<typeof usePendingConsents>;
