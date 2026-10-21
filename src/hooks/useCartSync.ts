import { useQueryClient } from '@tanstack/react-query';
import { cartApi } from '@/lib/api';
import { qk } from '@/lib/query';
import { useAuthStore } from '@/stores/authStore';
import { useCartStore, type CartItem } from '@/stores/cartStore';
import { captureException } from '@/services/sentry';
import { toast } from '@/ui';
import i18n from '@/i18n/config';
import { errorText } from '@/lib/api/errorText';
import { classifyCartError } from '@/lib/cart/mergeLocalCart';

type NewCartItem = Omit<CartItem, 'id' | 'quantity' | 'addedAt'>;

/**
 * How a cart write ended, once the server mirror (if any) settled: `rejected` means the server
 * refused the line for good and the local write was undone (the server's message is already
 * shown); `applied` covers everything else (guest, success, a transient error that keeps the
 * local line). Passed to a write's optional `onSettled`.
 */
export type CartWriteResult = 'applied' | 'rejected';
type OnCartWriteSettled = (result: CartWriteResult) => void;

/**
 * Sepet yazma işlemleri — yerel store'a yazar, üyede sunucuya da aynalar.
 *
 * Faz A kararı: checkout hâlâ yerel store'dan besleniyor, bu yüzden yerel yazma
 * OTORİTE, sunucu çağrısı best-effort. GEÇİCİ hata (5xx/ağ) kullanıcının
 * sepetini bozmaz; Sentry'ye düşer ve bir sonraki yazmada/senkronda toparlanır.
 *
 * Ama **4xx başka bir şeydir**: sunucu o satırı REDDETTİ ve bu kalıcı
 * (askıya alınmış satıcı, satışa uygun olmayan ürün, stok…). Eskiden bu da
 * yutuluyordu; satır sepette kalıyor, çağıranlar "Sepete eklendi" diyordu ve
 * kullanıcı satın alınamaz bir ürünü sepetinde satın alınabilir görüyordu.
 * Artık iyimser yazma geri alınır ve sunucunun mesajı gösterilir.
 *
 * Bileşenler store aksiyonlarını doğrudan çağırmak yerine bunu kullanmalı ki
 * iki taraf birbirinden kaymasın.
 */
export function useCartSync() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const userId = useAuthStore((s) => s.user?.id);
  const queryClient = useQueryClient();

  /**
   * @param onReject KESİN retde çağrılır — iyimser yazmayı geri almak ve sunucunun mesajını
   *   göstermek için: satırın kalıcı 4xx reddi ya da (kullanıcının kendi eylemi olduğu için)
   *   kesin 403 (hesap düzeyi: e-posta doğrulanmadı / ban…, ya da satıra özgü). 401 / 408 / 429 /
   *   tanınmayan 403 / 5xx / ağ geçicidir, ret DEĞİLDİR (`classifyCartError`).
   *   Verilmezse eski davranış (yalnız raporla) korunur.
   * @param resyncOnTransient geçici hatada satır sunucuya ulaşmadı: yerel satır KORUNUR ve
   *   sepet birleştirmesi bekliyor işaretlenir (`useCartMergeOnLogin` sonra gönderir).
   */
  const mirror = (
    run: () => Promise<unknown>,
    flow: string,
    onReject?: (message: string) => void,
    resyncOnTransient = false,
  ): Promise<CartWriteResult> => {
    if (!isAuthenticated) return Promise.resolve('applied');
    return run()
      .then(() => queryClient.invalidateQueries({ queryKey: qk.cart.mine }))
      .then((): CartWriteResult => 'applied')
      .catch((error): CartWriteResult => {
        const kind = classifyCartError(error);
        let result: CartWriteResult = 'applied';
        if (kind === 'rejected' || kind === 'accountBlocked' || kind === 'itemForbidden') {
          if (onReject) {
            onReject(errorText(error, i18n.t('cart.addToCartFailed')));
            result = 'rejected';
          }
        } else if (resyncOnTransient && userId) {
          useCartStore.getState().markMergePending(userId);
        }
        captureException(error, { level: 'warning', tags: { flow } });
        return result;
      });
  };

  return {
    /** `onSettled` runs once the write is final (at once for a guest or when nothing changed). */
    add: (item: NewCartItem, quantity = 1, onSettled?: OnCartWriteSettled) => {
      // Geri alma için ÖNCEKİ hâli sakla: satır zaten varsa adet artıyor,
      // reddedilince satırı silmek değil eski adede dönmek doğru olan.
      const before = useCartStore.getState().items.find((i) => i.productId === item.productId);
      // Tek adette eski çağrı biçimi korunur (varsayılan 1); yalnız adet seçici >1 verir.
      if (quantity > 1) useCartStore.getState().addItem(item, quantity);
      else useCartStore.getState().addItem(item);
      // Sunucuya istenen değil, store'un GERÇEKTEN eklediği fark gider: store stok/sipariş
      // tavanında sessizce kırpıyor; ham `quantity` gönderilirse yerel ve sunucu sepeti ayrışır.
      const after = useCartStore.getState().items.find((i) => i.productId === item.productId);
      const added = (after?.quantity ?? 0) - (before?.quantity ?? 0);
      if (added <= 0) {
        // Already at the cap: nothing changed locally, no server call.
        onSettled?.('applied');
        return;
      }
      // Aksiyonlar zustand'da kararlı referans; geri alma bayat closure'dan da
      // güvenle çağrılır (state'i çağrı anında okurlar).
      void mirror(() => cartApi.addItem(item.productId, added), 'cart.add', (message) => {
        if (before) useCartStore.getState().updateQuantity(before.id, before.quantity);
        else useCartStore.getState().removeByProductId(item.productId);
        toast.error(message);
      }, !before).then(onSettled);
    },

    /**
     * Without `onSettled` (the cart screen) the local removal is final and a server error is only
     * reported, as before. With it (the card toggle, web parity) a member's removal the server did
     * not apply is undone: the line comes back and the reason is shown (`rejected`). A 404 means
     * the server cart did not hold the line, so the removal stands.
     */
    removeByProductId: (productId: string, onSettled?: OnCartWriteSettled) => {
      const before = useCartStore.getState().items.find((i) => i.productId === productId);
      useCartStore.getState().removeByProductId(productId);
      if (!onSettled) {
        void mirror(() => cartApi.removeItem(productId), 'cart.remove');
        return;
      }
      if (!isAuthenticated) {
        onSettled('applied');
        return;
      }
      cartApi.removeItem(productId).then(
        () => {
          void queryClient.invalidateQueries({ queryKey: qk.cart.mine });
          onSettled('applied');
        },
        (error: unknown) => {
          captureException(error, { level: 'warning', tags: { flow: 'cart.remove' } });
          if ((error as { response?: { status?: number } })?.response?.status === 404) {
            onSettled('applied');
            return;
          }
          if (before) useCartStore.getState().restoreItem(before);
          toast.error(errorText(error, i18n.t('product.removeFromCartFailed')));
          onSettled('rejected');
        },
      );
    },

    removeItem: (itemId: string) => {
      const line = useCartStore.getState().items.find((i) => i.id === itemId);
      useCartStore.getState().removeItem(itemId);
      if (line) void mirror(() => cartApi.removeItem(line.productId), 'cart.remove');
    },

    setQuantity: (itemId: string, quantity: number) => {
      const line = useCartStore.getState().items.find((i) => i.id === itemId);
      useCartStore.getState().updateQuantity(itemId, quantity);
      if (!line) return;
      // Sunucuya istenen değil, store'un GERÇEKTEN yazdığı adet gider (`add` ile aynı kural):
      // store stok/sipariş tavanında kırpıyor; ham değer gitseydi sunucu 4xx ile reddeder,
      // yerel 3 / sunucu 5 diye ayrışırdı. Store 1'in altını silme sayar → sunucuda 0.
      const after = useCartStore.getState().items.find((i) => i.id === itemId);
      const applied = after?.quantity ?? 0;
      if (after && applied === line.quantity) return; // değişmedi: sunucu çağrısı yok
      void mirror(() => cartApi.updateItem(line.productId, applied), 'cart.update', (message) => {
        // Sunucu reddetti: yerel adedi sunucudakine (önceki hâl) geri al, taze sepeti çek.
        if (useCartStore.getState().items.some((i) => i.id === itemId)) {
          useCartStore.getState().updateQuantity(itemId, line.quantity);
        }
        queryClient.invalidateQueries({ queryKey: qk.cart.mine });
        toast.error(message);
      });
    },

    clear: () => {
      useCartStore.getState().clearCart();
      void mirror(() => cartApi.clear(), 'cart.clear');
    },
  };
}
