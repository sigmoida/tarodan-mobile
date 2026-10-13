import { useCallback, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { legalIdentityApi } from '@/lib/api';
import { qk, queryClient as appQueryClient, retryUnlessClientError } from '@/lib/query';
import { requiredStepState } from '@/lib/requiredSteps';
import { needsLegalIdentity } from '@/lib/legalIdentity';
import type { LegalIdentityStatus, SubmitLegalIdentityRequest } from '@/lib/shared/legalIdentity';
import { useAuthStore } from '@/stores/authStore';
import {
  openLegalIdentityRequest,
  settleLegalIdentityRequest,
  useLegalIdentityRequestStore,
} from '@/stores/legalIdentityRequestStore';

/** "Vazgeç": bekleyen işlem(ler) iptal. Modül seviyesinde → kimliği sabit. */
const cancelRequest = () => settleLegalIdentityRequest(false);

const fetchStatus = async (): Promise<LegalIdentityStatus> =>
  (await legalIdentityApi.getStatus()).data;

function useSignedIn() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  return isAuthenticated && !isLoading;
}

/**
 * Üyenin yasal kimlik durumu (web `useLegalIdentity`): eksik alanlar (sunucu
 * hesaplar — personel ve test hesabı muaf), salt-okunur ad-soyad ve maskeli
 * TCKN. Misafirde sorgu çalışmaz. Profildeki "Kimlik bilgileri" bölümü okur.
 */
export function useLegalIdentityStatus() {
  const enabled = useSignedIn();
  const query = useQuery({
    queryKey: qk.legalIdentity.me,
    queryFn: fetchStatus,
    enabled,
    retry: retryUnlessClientError,
  });
  return {
    status: enabled ? (query.data ?? null) : null,
    isLoading: enabled && query.isPending,
    isError: enabled && query.isError,
  };
}

/**
 * Eksik alanları gönder (yalnız eksikler — dolu alan 409). Yanıt güncel
 * durumdur: önbelleğe yazılır (kapı ve profil ek istek atmadan tazelenir) ve
 * artık eksik yoksa bekleyen işlem devam eder.
 */
export function useSubmitLegalIdentity() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (body: SubmitLegalIdentityRequest) =>
      (await legalIdentityApi.submit(body)).data,
    onSuccess: (status) => {
      client.setQueryData(qk.legalIdentity.me, status);
      if (!needsLegalIdentity(status)) settleLegalIdentityRequest(true);
    },
  });
}

/**
 * Zorunlu adımlar sırasındaki kimlik adımı. Web'den fark (Apple 5.1.1):
 * kimlik girişte DEĞİL, bir işlem `ensureLegalIdentity()` çağırınca istenir —
 * adım yalnız o zaman `pending` olabilir. Sorgu başarısızsa ya da sunucu
 * "gerek yok" derse istek kendiliğinden `true` ile kapanır (fail-open: sunucu
 * zorlamıyor); oturum kapanırsa `false` ile (işlem iptal).
 */
export function useLegalIdentityStep() {
  const signedIn = useSignedIn();
  const requested = useLegalIdentityRequestStore((s) => s.requested);
  const enabled = signedIn && requested;

  const query = useQuery({
    queryKey: qk.legalIdentity.me,
    queryFn: fetchStatus,
    enabled,
    retry: retryUnlessClientError,
  });

  const status = enabled ? (query.data ?? null) : null;
  const state = requested
    ? requiredStepState({
        enabled,
        isPending: query.isPending,
        needed: needsLegalIdentity(status),
      })
    : 'done';

  useEffect(() => {
    if (!requested) return;
    if (!signedIn) settleLegalIdentityRequest(false);
    else if (state === 'done') settleLegalIdentityRequest(true);
  }, [requested, signedIn, state]);

  return {
    status,
    state,
    cancel: cancelRequest,
  };
}

export type LegalIdentityStepController = ReturnType<typeof useLegalIdentityStep>;

/**
 * İhtiyaç anında kimlik kapısı. Kimlik gerektiren bir işlemi (ödeme, ilan
 * verme, takas, banka hesabı) başlatmadan ÖNCE çağır:
 *
 *   if (!(await ensureLegalIdentity())) return; // vazgeçti → işlem iptal
 *
 * - kimlik tamamsa, hesap muafsa ya da misafirse hemen `true`;
 * - eksikse kimlik adımını açar; kaydedilince `true`, "Vazgeç"te `false`;
 * - durum alınamazsa `true` (fail-open — sunucu zorlamıyor, işlemi kilitleme).
 *
 * Kimlik adımı kök düzende bir katmandır: açık bir ui `Modal`'ın ALTINDA
 * kalır. Modal içinden çağırma; önce modalı kapat ya da modalı açmadan önce çağır.
 */
export async function ensureLegalIdentity(client: QueryClient = appQueryClient): Promise<boolean> {
  const { isAuthenticated, isLoading } = useAuthStore.getState();
  if (!isAuthenticated || isLoading) return true;

  // Tamamlanan kimlik geri açılmaz (düzeltme yalnız admin): önbellek "tamam"
  // diyorsa ağa çıkma. "Eksik" diyorsa taze sor — web'de tamamlanmış olabilir.
  const cached = client.getQueryData<LegalIdentityStatus>(qk.legalIdentity.me);
  if (cached && !needsLegalIdentity(cached)) return true;

  let status: LegalIdentityStatus;
  try {
    status = await client.fetchQuery({
      queryKey: qk.legalIdentity.me,
      queryFn: fetchStatus,
      staleTime: 0,
      retry: false,
    });
  } catch {
    return true;
  }
  if (!needsLegalIdentity(status)) return true;
  return openLegalIdentityRequest();
}

/**
 * `ensureLegalIdentity`in ekran/hook içi hâli: sağlayıcıdaki QueryClient'ı
 * kullanır (testlerde ve önbellek paylaşımında doğru örnek).
 *
 *   const requireIdentity = useRequireLegalIdentity();
 *   const onPay = async () => { if (!(await requireIdentity())) return; pay(); };
 */
export function useRequireLegalIdentity(): () => Promise<boolean> {
  const client = useQueryClient();
  return useCallback(() => ensureLegalIdentity(client), [client]);
}
