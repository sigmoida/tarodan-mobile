import { useTranslation } from 'react-i18next';
import { toast } from '@/ui';
import { useCartStore } from '@/stores/cartStore';
import { useCartWritesStore } from '@/stores/cartWritesStore';
import { captureException } from '@/services/sentry';
import { cartItemFromListing, type CartListing } from '@/lib/cart/cartItemFromListing';
import { useCartSync, type CartWriteResult } from './useCartSync';

/**
 * Add a listing to the cart, or take it out when it is already there: the listing card's cart
 * action (web `useCartToggle`, decision D10). It reads the one local cart (guest and member alike;
 * a member's write is mirrored to the server by `useCartSync`), so it sends no request until
 * pressed.
 *
 * - The in-cart state is a per-listing selector: only this card re-renders when its line changes.
 * - While a member's write for the listing runs, every card of that listing is busy (`isPending`,
 *   `useCartWritesStore`) and ignores a press, so an add and a remove never race on the server.
 * - Success shows the web toast ("Ürün sepete eklendi" / "Ürün sepetten çıkarıldı"). An add or
 *   remove the server refuses is undone and its reason shown by `useCartSync`; then no success
 *   toast.
 */
export function useCartToggle(listing: CartListing) {
  const { t } = useTranslation();
  const cart = useCartSync();
  const inCart = useCartStore((s) => s.items.some((i) => i.productId === listing.id));
  const isPending = useCartWritesStore((s) => s.inFlight.includes(listing.id));

  const toggle = () => {
    const productId = listing.id;
    const writes = useCartWritesStore.getState();
    if (!writes.begin(productId)) return;
    const remove = useCartStore.getState().isInCart(productId);
    const settled = (result: CartWriteResult) => {
      useCartWritesStore.getState().end(productId);
      if (result === 'rejected') return;
      toast.success(remove ? t('product.removedFromCart') : t('product.addedToCart'));
    };
    try {
      if (remove) cart.removeByProductId(productId, settled);
      else cart.add(cartItemFromListing(listing, t('product.seller')), 1, settled);
    } catch (error) {
      // A synchronous failure (a malformed listing) never locks the listing or escapes the press
      // handler: it is reported and the press says it failed.
      writes.end(productId);
      captureException(error, { level: 'warning', tags: { flow: remove ? 'cart.remove' : 'cart.add' } });
      toast.error(t('common.operationFailed'));
    }
  };

  return { inCart, isPending, toggle };
}
