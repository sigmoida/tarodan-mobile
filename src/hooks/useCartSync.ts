import { useQueryClient } from '@tanstack/react-query';
import { cartApi } from '@/lib/api';
import { qk } from '@/lib/query';
import { useAuthStore } from '@/stores/authStore';
import { useCartStore, type CartItem } from '@/stores/cartStore';
import { captureException } from '@/services/sentry';
import { toast } from '@/ui';
import i18n from '@/i18n/config';
import { errorText } from '@/lib/api/errorText';

type NewCartItem = Omit<CartItem, 'id' | 'quantity' | 'addedAt'>;

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
  const queryClient = useQueryClient();
  const store = useCartStore();

  /**
   * @param onReject 4xx'te çağrılır — iyimser yazmayı geri almak için.
   *   Verilmezse eski davranış (yalnız raporla) korunur.
   */
  const mirror = (
    run: () => Promise<unknown>,
    flow: string,
    onReject?: (message: string) => void,
  ) => {
    if (!isAuthenticated) return;
    run()
      .then(() => queryClient.invalidateQueries({ queryKey: qk.cart.mine }))
      .catch((error) => {
        const status = (error as { response?: { status?: number } })?.response?.status;
        const rejected = typeof status === 'number' && status >= 400 && status < 500;
        if (rejected && onReject) {
          onReject(errorText(error, i18n.t('cart.addToCartFailed')));
        }
        captureException(error, { level: 'warning', tags: { flow } });
      });
  };

  return {
    add: (item: NewCartItem, quantity = 1) => {
      // Geri alma için ÖNCEKİ hâli sakla: satır zaten varsa adet artıyor,
      // reddedilince satırı silmek değil eski adede dönmek doğru olan.
      const before = useCartStore.getState().items.find((i) => i.productId === item.productId);
      // Tek adette eski çağrı biçimi korunur (varsayılan 1); yalnız adet seçici >1 verir.
      if (quantity > 1) store.addItem(item, quantity);
      else store.addItem(item);
      // Sunucuya istenen değil, store'un GERÇEKTEN eklediği fark gider: store stok/sipariş
      // tavanında sessizce kırpıyor; ham `quantity` gönderilirse yerel ve sunucu sepeti ayrışır.
      const after = useCartStore.getState().items.find((i) => i.productId === item.productId);
      const added = (after?.quantity ?? 0) - (before?.quantity ?? 0);
      if (added <= 0) return; // tavandaydı: yerel değişmedi, sunucu çağrısı yok
      // Aksiyonlar zustand'da kararlı referans; geri alma bayat closure'dan da
      // güvenle çağrılır (state'i çağrı anında okurlar).
      mirror(() => cartApi.addItem(item.productId, added), 'cart.add', (message) => {
        if (before) store.updateQuantity(before.id, before.quantity);
        else store.removeByProductId(item.productId);
        toast.error(message);
      });
    },

    removeByProductId: (productId: string) => {
      store.removeByProductId(productId);
      mirror(() => cartApi.removeItem(productId), 'cart.remove');
    },

    removeItem: (itemId: string) => {
      const line = useCartStore.getState().items.find((i) => i.id === itemId);
      store.removeItem(itemId);
      if (line) mirror(() => cartApi.removeItem(line.productId), 'cart.remove');
    },

    setQuantity: (itemId: string, quantity: number) => {
      const line = useCartStore.getState().items.find((i) => i.id === itemId);
      store.updateQuantity(itemId, quantity);
      if (!line) return;
      // Sunucuya istenen değil, store'un GERÇEKTEN yazdığı adet gider (`add` ile aynı kural):
      // store stok/sipariş tavanında kırpıyor; ham değer gitseydi sunucu 4xx ile reddeder,
      // yerel 3 / sunucu 5 diye ayrışırdı. Store 1'in altını silme sayar → sunucuda 0.
      const after = useCartStore.getState().items.find((i) => i.id === itemId);
      const applied = after?.quantity ?? 0;
      if (after && applied === line.quantity) return; // değişmedi: sunucu çağrısı yok
      mirror(() => cartApi.updateItem(line.productId, applied), 'cart.update', (message) => {
        // Sunucu reddetti: yerel adedi sunucudakine (önceki hâl) geri al, taze sepeti çek.
        if (useCartStore.getState().items.some((i) => i.id === itemId)) {
          store.updateQuantity(itemId, line.quantity);
        }
        queryClient.invalidateQueries({ queryKey: qk.cart.mine });
        toast.error(message);
      });
    },

    clear: () => {
      store.clearCart();
      mirror(() => cartApi.clear(), 'cart.clear');
    },
  };
}
