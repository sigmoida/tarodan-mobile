import { useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { cartApi, type ServerCart, type ServerCartItem } from '@/lib/api';
import { qk } from '@/lib/query';
import { useAuthStore } from '@/stores/authStore';
import { useCartStore } from '@/stores/cartStore';
import { captureException } from '@/services/sentry';

/**
 * Üyenin sunucu sepeti.
 *
 * Sunucu, istemcinin üretemediği bilgileri döndürür: satır bazında
 * `isAvailable` / `stockWarning` / `maxQuantity` ve kampanya-indirim toplamları.
 * Yerel store stok tavanını sepete eklerken donduruyor; ürün sonradan tükenirse
 * kullanıcı bunu ancak checkout'ta görüyordu. Bu query o boşluğu kapatır.
 *
 * Misafirde hiç çalışmaz — /cart uçlarının tamamı bearer ister.
 */
export function useServerCart() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const query = useQuery({
    queryKey: qk.cart.mine,
    enabled: isAuthenticated,
    staleTime: 30_000,
    queryFn: async () => {
      const res = await cartApi.get();
      return ((res.data as any)?.data ?? res.data ?? null) as ServerCart | null;
    },
  });

  const items = query.data?.calculation?.items ?? [];
  const byProductId = new Map<string, ServerCartItem>(items.map((it) => [it.productId, it]));

  return {
    cart: query.data ?? null,
    calculation: query.data?.calculation ?? null,
    /** Yerel satırı sunucu satırıyla eşlemek için — uyarıları göstermekte kullanılır. */
    byProductId,
    isLoading: query.isLoading,
  };
}

/**
 * Misafirken sepete atılan ürünleri giriş sonrası sunucu sepetine taşır.
 *
 * Yalnız sunucuda BULUNMAYAN satırlar gönderilir; mevcut satırın adedi
 * değiştirilmez, böylece başka cihazdaki sepet ezilmez. Oturum başına bir kez
 * çalışır (ref guard) — aksi halde her yeniden render kopya satır üretirdi.
 */
export function useCartMergeOnLogin() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const userId = useAuthStore((s) => s.user?.id);
  const queryClient = useQueryClient();
  const mergedForUser = useRef<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !userId) {
      mergedForUser.current = null;
      return;
    }
    if (mergedForUser.current === userId) return;
    mergedForUser.current = userId;

    const localItems = useCartStore.getState().items;
    if (localItems.length === 0) return;

    (async () => {
      try {
        const res = await cartApi.get();
        const server = ((res.data as any)?.data ?? res.data ?? null) as ServerCart | null;
        const existing = new Set(
          (server?.calculation?.items ?? []).map((it) => it.productId),
        );
        const missing = localItems.filter((it) => !existing.has(it.productId));
        if (missing.length === 0) return;

        for (const item of missing) {
          // 4xx = sunucu bu satırı REDDETTİ (satışa uygun değil, askıda satıcı…).
          // Eskiden hata yutuluyordu ve satır yerelde HAYALET kalıyordu: sunucuda
          // karşılığı yok, checkout'ta patlıyor. Reddedileni düşür.
          // 5xx/ağ geçicidir — satır korunur, bir sonraki oturumda yeniden denenir.
          // Uyarı çıkarılmaz: bu kullanıcının tetiklemediği bir arka plan
          // uzlaştırması, açılışta modal basmak yersiz olurdu.
          await cartApi.addItem(item.productId, item.quantity).catch((error) => {
            const status = (error as { response?: { status?: number } })?.response?.status;
            if (typeof status === 'number' && status >= 400 && status < 500) {
              useCartStore.getState().removeByProductId(item.productId);
            }
          });
        }
        queryClient.invalidateQueries({ queryKey: qk.cart.mine });
      } catch (error) {
        // Birleştirme başarısız olsa da yerel sepet duruyor; kullanıcı kaybetmiyor.
        captureException(error, { level: 'warning', tags: { flow: 'cart.mergeOnLogin' } });
      }
    })();
  }, [isAuthenticated, userId, queryClient]);
}
