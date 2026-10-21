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
import { getSessionEpoch } from '@/lib/api/sessionState';

type NewCartItem = Omit<CartItem, 'id' | 'quantity' | 'addedAt'>;

/**
 * How a cart write ended, once the server mirror (if any) settled: `rejected` means the local
 * write was undone (the reason is already shown) or the session ended before it settled, so no
 * success message follows; `applied` covers everything else (guest, success, a transient error that keeps the
 * local line). Passed to a write's optional `onSettled`.
 */
export type CartWriteResult = 'applied' | 'rejected';
type OnCartWriteSettled = (result: CartWriteResult) => void;

/**
 * Cart writes: each writes the local store and, for a member, mirrors it to the server.
 *
 * Phase A decision: checkout still reads the local store, so the local write is authoritative
 * and the server call is best effort. A transient error (5xx, network) does not break the user's
 * cart; it goes to Sentry and is recovered by the next write or the cart merge.
 *
 * A 4xx is different: the server refused the line for good (suspended seller, listing not for
 * sale, stock...). The optimistic write is undone and the server's message shown, so the cart
 * never shows a listing that cannot be bought as buyable.
 *
 * A result that lands after the session changed (logout, or a new login, `getSessionEpoch`)
 * touches nothing and shows nothing: the cart is no longer the one the write was for.
 *
 * Components use this instead of the store actions, so the two carts do not drift.
 */
export function useCartSync() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const userId = useAuthStore((s) => s.user?.id);
  const queryClient = useQueryClient();

  /**
   * @param onReject called on a final refusal, to undo the optimistic write and show the
   *   server's message: a permanent 4xx for the line, or a definite 403 (account level: e-mail
   *   not verified, ban...; or line specific), since the write was the user's own action. 401 /
   *   408 / 429 / an unrecognised 403 / 5xx / network are transient, not a refusal
   *   (`classifyCartError`). Without it the error is only reported.
   * @param resyncOnTransient on a transient error the line may not have reached the server: the
   *   local line stays and the cart is marked for merge (`useCartMergeOnLogin` sends it later).
   */
  const mirror = (
    run: () => Promise<unknown>,
    flow: string,
    onReject?: (message: string) => void,
    resyncOnTransient = false,
  ): Promise<CartWriteResult> => {
    if (!isAuthenticated) return Promise.resolve('applied');
    const epoch = getSessionEpoch();
    // The executor runs `run` at once, and a synchronous throw (an interceptor) becomes a
    // rejection: it takes the same path as a failed request instead of escaping after the local
    // write.
    return new Promise((resolve) => resolve(run()))
      .then(async (): Promise<CartWriteResult> => {
        if (getSessionEpoch() !== epoch) return 'rejected';
        await queryClient.invalidateQueries({ queryKey: qk.cart.mine });
        // The session can also end while the cart refetch runs.
        return getSessionEpoch() === epoch ? 'applied' : 'rejected';
      })
      .catch((error): CartWriteResult => {
        // Not reported: the old session's own 401 (the forced logout) is no cart failure.
        if (getSessionEpoch() !== epoch) return 'rejected';
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
     * not apply is undone: the line comes back where it was, with its checkout selection, and the
     * reason is shown (`rejected`). On a transient error the server may or may not have applied
     * it, so the cart is also marked for merge: the merge sends the restored line again and both
     * carts agree. A 404 means the server cart did not hold the line: the removal stands (a
     * deliberate difference from web, whose cart is the server's: here the local line was the
     * only copy). A result after a session change touches nothing.
     */
    removeByProductId: (productId: string, onSettled?: OnCartWriteSettled) => {
      const { items, deselectedIds } = useCartStore.getState();
      const index = items.findIndex((i) => i.productId === productId);
      const before = index >= 0 ? items[index] : undefined;
      const deselected = before ? deselectedIds.includes(before.id) : false;
      useCartStore.getState().removeByProductId(productId);
      if (!onSettled) {
        void mirror(() => cartApi.removeItem(productId), 'cart.remove');
        return;
      }
      if (!isAuthenticated) {
        onSettled('applied');
        return;
      }
      const epoch = getSessionEpoch();
      const refreshServerCart = () => void queryClient.invalidateQueries({ queryKey: qk.cart.mine });
      // The executor runs at once, and a synchronous throw (an interceptor) becomes a rejection,
      // so the undo below covers it too.
      new Promise((resolve) => resolve(cartApi.removeItem(productId))).then(
        () => {
          if (getSessionEpoch() !== epoch) return onSettled('rejected');
          refreshServerCart();
          onSettled('applied');
        },
        (error: unknown) => {
          // Not reported: the old session's own 401 (the forced logout) is no cart failure.
          if (getSessionEpoch() !== epoch) return onSettled('rejected');
          if ((error as { response?: { status?: number } })?.response?.status === 404) {
            refreshServerCart();
            onSettled('applied');
            return;
          }
          captureException(error, { level: 'warning', tags: { flow: 'cart.remove' } });
          if (before) useCartStore.getState().restoreItem(before, { index, deselected });
          const kind = classifyCartError(error);
          if (userId && (kind === 'transient' || kind === 'forbiddenUnknown')) {
            useCartStore.getState().markMergePending(userId);
          }
          refreshServerCart();
          toast.error(errorText(error, i18n.t('common.operationFailed')));
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
