import { useCallback, useEffect, useRef, useState } from 'react';
import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import { legalIdentityApi } from '@/lib/api';
import { qk, queryClient as appQueryClient, retryUnlessClientError } from '@/lib/query';
import { requiredStepState } from '@/lib/requiredSteps';
import { needsLegalIdentity } from '@/lib/legalIdentity';
import type { LegalIdentityStatus, SubmitLegalIdentityRequest } from '@/lib/shared/legalIdentity';
import { useAuthStore } from '@/stores/authStore';
import {
  openLegalIdentityRequest,
  settleLegalIdentityRequest,
  showLegalIdentitySavedNotice,
  useLegalIdentityRequestStore,
} from '@/stores/legalIdentityRequestStore';
import { useRefetchOnForeground } from './useRefetchOnForeground';

/** "Vazgeç": bekleyen işlem(ler) iptal. Modül seviyesinde → kimliği sabit. */
const cancelRequest = () => settleLegalIdentityRequest(false);

/**
 * Kimlik durumunun TEK sorgu tanımı: profil kartı, kapı adımı ve
 * `ensureLegalIdentity` aynı anahtarı, fetcher'ı ve yeniden deneme kuralını
 * kullanır (4xx denenmez; 404 = uç yok → fail-open hemen döner).
 */
export const legalIdentityQueryOptions = queryOptions({
  queryKey: qk.legalIdentity.me,
  queryFn: async (): Promise<LegalIdentityStatus> => (await legalIdentityApi.getStatus()).data,
  retry: retryUnlessClientError,
});

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
  const query = useQuery({ ...legalIdentityQueryOptions, enabled });
  return {
    status: enabled ? (query.data ?? null) : null,
    isLoading: enabled && query.isPending,
    isError: enabled && query.isError,
  };
}

/**
 * Eksik alanları gönder (yalnız eksikler — dolu alan 409). Yanıt güncel
 * durumdur: önbelleğe yazılır (kapı ve profil ek istek atmadan tazelenir),
 * "kaydedildi" bildirimi sıraya girer ve artık eksik yoksa bekleyen işlem
 * devam eder.
 */
export function useSubmitLegalIdentity() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (body: SubmitLegalIdentityRequest) =>
      (await legalIdentityApi.submit(body)).data,
    onSuccess: (status) => {
      client.setQueryData(legalIdentityQueryOptions.queryKey, status);
      // Web `successMessage` ile aynı bildirim; kapı kapanınca gösterilir
      // (`LegalIdentitySavedNotice`) — kapının içinde bildirim yok.
      showLegalIdentitySavedNotice();
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

  const query = useQuery({ ...legalIdentityQueryOptions, enabled });
  // Adım açıkken üye kimliğini web'de tamamlayıp dönebilir: ön plana dönüşte
  // durum yenilenir, artık eksik yoksa adım kendiliğinden kapanır (işlem devam).
  useRefetchOnForeground(legalIdentityQueryOptions.queryKey, { enabled });

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
 * İhtiyaç anında kimlik kapısı. Kimlik gerektiren bir işlemi başlatmadan
 * ÖNCE çağır (ekran metni `identity.gate.whenNeeded` bu listeyi anlatır):
 * sepet ödemesi (`useCheckout`), teklif/bekleyen siparişin ödemesi
 * (`useOrderActions`), ödeme yeniden denemesi (`app/payment/fail`,
 * `usePayments`), takas başlatma (`useNewTrade`) / karşı teklif
 * (`useTradeCounter`) / kabul ve nakit ödeme (`useTradeActions`), ilan verme
 * (`useListingForm`) ve banka hesabı ekleme (`useBankAccount`). Hepsi
 * `useRequireLegalIdentity()` ile bağlı.
 *
 *   if (!(await ensureLegalIdentity())) return; // vazgeçti → işlem iptal
 *
 * - kimlik tamamsa, hesap muafsa ya da misafirse hemen `true`;
 * - eksikse kimlik adımını açar; kaydedilince `true`, "Vazgeç"te `false`
 *   (ikisi de kapı modalı kapandıktan SONRA — `settleLegalIdentityRequest`);
 * - durum alınamazsa `true` (fail-open — sunucu zorlamıyor, işlemi kilitleme).
 *
 * Kimlik adımı native tam ekran bir Modal'dır (`FullScreenGate`), açık ekran
 * modallarının üstünde kalır. Yine de açık bir ui `Modal`'ın ya da `appAlert`
 * onay penceresinin içinden çağırma: iOS iki modalı aynı anda sunamaz. Önce
 * kapıyı geç, sonra onayı/modalı aç.
 */
export async function ensureLegalIdentity(client: QueryClient = appQueryClient): Promise<boolean> {
  if (!legalIdentityCheckNeeded(client)) return true;

  let status: LegalIdentityStatus;
  try {
    status = await client.fetchQuery({ ...legalIdentityQueryOptions, staleTime: 0 });
  } catch {
    return true;
  }
  if (!needsLegalIdentity(status)) return true;
  return openLegalIdentityRequest();
}

/**
 * Ağa çıkmadan karar verilemiyor mu? Misafirde ve önbellek "tamam" diyorken
 * `false` (tamamlanan kimlik geri açılmaz — düzeltme yalnız admin). "Eksik"
 * diyorsa taze sorulur: web'de tamamlanmış olabilir.
 */
function legalIdentityCheckNeeded(client: QueryClient): boolean {
  const { isAuthenticated, isLoading } = useAuthStore.getState();
  if (!isAuthenticated || isLoading) return false;
  const cached = client.getQueryData(legalIdentityQueryOptions.queryKey);
  return !(cached && !needsLegalIdentity(cached));
}

export interface RequireLegalIdentity {
  /** `ensureLegalIdentity` — vazgeçilirse (ya da kontrol zaten sürüyorsa) `false`. */
  requireIdentity: () => Promise<boolean>;
  /**
   * Kontrol sürüyor (durum isteği ağda ya da kapı açık). Düğme bu sürede
   * "yükleniyor" ve devre dışı görünmeli. Önbellek "tamam" ise hiç `true`
   * olmaz (titreme yok).
   */
  isChecking: boolean;
}

/**
 * `ensureLegalIdentity`in ekran/hook içi hâli: sağlayıcıdaki QueryClient'ı
 * kullanır (testlerde ve önbellek paylaşımında doğru örnek).
 *
 *   const { requireIdentity, isChecking } = useRequireLegalIdentity();
 *   const onPay = async () => { if (!(await requireIdentity())) return; pay(); };
 *   <Button isLoading={isChecking || pay.isPending} disabled={isChecking || …} />
 *
 * Aynı hook örneğinden bir kontrol sürerken gelen ikinci çağrı `false` döner:
 * `isChecking` render'a yansıyana kadar geçen kısa arada ikinci basış ikinci
 * siparişi/ilanı/takası başlatmasın.
 */
export function useRequireLegalIdentity(): RequireLegalIdentity {
  const client = useQueryClient();
  const inFlight = useRef(false);
  const [isChecking, setIsChecking] = useState(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const requireIdentity = useCallback(async () => {
    if (inFlight.current) return false;
    inFlight.current = true;
    let slow = false;
    try {
      slow = legalIdentityCheckNeeded(client);
      if (slow) setIsChecking(true);
      return await ensureLegalIdentity(client);
    } finally {
      inFlight.current = false;
      if (slow && mounted.current) setIsChecking(false);
    }
  }, [client]);

  return { requireIdentity, isChecking };
}

/**
 * Hedefli kimlik kapısı: aynı ekranda birden çok aksiyonun (ör. takas kabulü
 * ve nakit ödeme) kapıyı paylaştığı durumlar. Kontrol edilen HEDEF
 * `mutation.variables`'tan gelir (useState değil); böylece biri kontrol
 * edilirken öteki "yükleniyor" görünmez.
 *
 * Kontrol sürerken gelen ikinci çağrı (başka hedef de olsa) `false` döner ve
 * hedefi DEĞİŞTİRMEZ — senkron ref koruması, aynı render içindeki çift basışı
 * da kapsar (yoksa `variables` üzerine yazılır, spinner yanlış düğmeye kayardı).
 */
export function useRequireLegalIdentityFor<T>() {
  const { requireIdentity, isChecking } = useRequireLegalIdentity();
  const starting = useRef(false);
  const check = useMutation({ mutationFn: (_target: T) => requireIdentity() });

  const requireIdentityFor = async (target: T): Promise<boolean> => {
    if (starting.current) return false;
    starting.current = true;
    try {
      return await check.mutateAsync(target);
    } catch {
      return false;
    } finally {
      starting.current = false;
    }
  };

  return {
    requireIdentityFor,
    /** Kimliği kontrol edilen hedef — yalnız kontrol gerçekten ağda/kapıdaysa (titreme yok). */
    checkingTarget: check.isPending && isChecking ? (check.variables as T) : null,
    /** Herhangi bir hedef için kontrol sürüyor. */
    isPending: check.isPending,
  };
}
