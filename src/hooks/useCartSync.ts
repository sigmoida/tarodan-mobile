import { useQueryClient } from '@tanstack/react-query';
import { cartApi } from '@/lib/api';
import { qk } from '@/lib/query';
import { useAuthStore } from '@/stores/authStore';
import { useCartStore, type CartItem } from '@/stores/cartStore';
import { captureException } from '@/services/sentry';

type NewCartItem = Omit<CartItem, 'id' | 'quantity' | 'addedAt'>;

/**
 * Sepet yazma işlemleri — yerel store'a yazar, üyede sunucuya da aynalar.
 *
 * Faz A kararı: checkout hâlâ yerel store'dan besleniyor, bu yüzden yerel yazma
 * OTORİTE, sunucu çağrısı best-effort. Ağ hatası kullanıcının sepetini bozmaz;
 * hata Sentry'ye düşer ve bir sonraki yazmada/senkronda kendini toparlar.
 *
 * Bileşenler store aksiyonlarını doğrudan çağırmak yerine bunu kullanmalı ki
 * iki taraf birbirinden kaymasın.
 */
export function useCartSync() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const queryClient = useQueryClient();
  const store = useCartStore();

  const mirror = (run: () => Promise<unknown>, flow: string) => {
    if (!isAuthenticated) return;
    run()
      .then(() => queryClient.invalidateQueries({ queryKey: qk.cart.mine }))
      .catch((error) => captureException(error, { level: 'warning', tags: { flow } }));
  };

  return {
    add: (item: NewCartItem, quantity = 1) => {
      store.addItem(item);
      mirror(() => cartApi.addItem(item.productId, quantity), 'cart.add');
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
      // Store 1'in altını silme sayar; sunucuda da 0 = satırı kaldır.
      mirror(() => cartApi.updateItem(line.productId, Math.max(0, quantity)), 'cart.update');
    },

    clear: () => {
      store.clearCart();
      mirror(() => cartApi.clear(), 'cart.clear');
    },
  };
}
