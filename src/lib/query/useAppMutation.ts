import { useMutation, useQueryClient, type UseMutationOptions } from '@tanstack/react-query';
import i18n from '@/i18n/config';
import { apiErrorMessage } from '@/lib/api/errorText';
import { toast } from '@/ui';

export interface UseAppMutationOptions<TData, TVars> {
  /**
   * Başarıda geçersiz kılınacak sorgu anahtarları (`qk.*` — ELLE anahtar yazma).
   * Her giriş, o önekle başlayan TÜM sorguları tazeler; elle `refetch()` gerekmez.
   */
  invalidates?: readonly (readonly unknown[])[];
  /** Başarı toast'ı (`toast.success`). Fonksiyon verirsen `(data, vars)` ile üretilir. */
  success?: string | ((data: TData, vars: TVars) => string);
  /**
   * Hata toast'ının YEDEK metni; asıl metin `apiErrorMessage(e, fallback)`
   * (sunucu mesajı varsa o). Verilmezse `common.operationFailed`.
   */
  error?: string | ((e: unknown) => string);
  /** Hata toast'ını bastırır (çağıran hatayı satır içi gösterecekse). */
  silentError?: boolean;
  onSuccess?: (data: TData, vars: TVars) => void;
  /** Hook'a özel hata dalları (captureException, kod bazlı yönlendirme...). `silentError` bunu bastırmaz. */
  onError?: (e: unknown, vars: TVars) => void;
  mutation?: Omit<UseMutationOptions<TData, unknown, TVars>, 'mutationFn' | 'onSuccess' | 'onError'>;
}

/**
 * Web `useWebMutation`'ın mobil karşılığı — yazma işlemlerinin TEK yolu:
 * `useMutation` + sorgu geçersiz kılma + `toast.success` / `toast.error`.
 *
 * Modal formlarında sıra: modalı KAPAT → `mutate` (CLAUDE.md §12, iOS donması);
 * toast yalnız sonuçla gelir, kapalı modalın üstünde görünür.
 *
 *   const save = useAppMutation((v: Vars) => api.save(v), {
 *     invalidates: [qk.offers.all],
 *     success: t('offer.saved'),
 *     error: t('offer.saveFailed'),
 *   });
 */
export function useAppMutation<TData, TVars = void>(
  mutationFn: (vars: TVars) => Promise<TData>,
  {
    invalidates = [],
    success,
    error,
    silentError = false,
    onSuccess,
    onError,
    mutation,
  }: UseAppMutationOptions<TData, TVars> = {},
) {
  const queryClient = useQueryClient();

  return useMutation<TData, unknown, TVars>({
    ...mutation,
    mutationFn,
    onSuccess: (data, vars) => {
      for (const queryKey of invalidates) {
        queryClient.invalidateQueries({ queryKey: queryKey as unknown[] });
      }
      const message = typeof success === 'function' ? success(data, vars) : success;
      if (message) toast.success(message);
      onSuccess?.(data, vars);
    },
    onError: (e, vars) => {
      if (!silentError) {
        const fallback =
          (typeof error === 'function' ? error(e) : error) || i18n.t('common.operationFailed');
        toast.error(apiErrorMessage(e, fallback));
      }
      onError?.(e, vars);
    },
  });
}
