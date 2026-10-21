import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from '@/ui';
import { useCartStore } from '@/stores/cartStore';
import { cartItemFromListing, type CartListing } from '@/lib/cart/cartItemFromListing';
import { useCartSync, type CartWriteResult } from './useCartSync';

/**
 * Listings whose card cart write runs, module-wide: the same listing can sit on two cards of one
 * screen (two home rails), and a press on the second must not start a remove that races the
 * first card's add on the server.
 */
const cartWritesInFlight = new Set<string>();

/** Test helper: forget writes left running by a previous test. */
export function resetCartToggleStateForTests() {
  cartWritesInFlight.clear();
}

/**
 * Add a listing to the cart, or take it out when it is already there: the listing card's cart
 * action (web `useCartToggle`, decision D10). It reads the one local cart (guest and member alike;
 * a member's write is mirrored to the server by `useCartSync`), so it sends no request until
 * pressed.
 *
 * - The in-cart state is a per-listing selector: only this card re-renders when its line changes.
 * - While a member's write for the listing runs, another press on any card of that listing is
 *   ignored (`isPending` on the pressed card), so an add and a remove never race on the server.
 * - Success shows the web toast ("Ürün sepete eklendi" / "Ürün sepetten çıkarıldı"). An add or
 *   remove the server refuses is undone and its reason shown by `useCartSync`; then no success
 *   toast.
 */
export function useCartToggle(listing: CartListing) {
  const { t } = useTranslation();
  const cart = useCartSync();
  const inCart = useCartStore((s) => s.items.some((i) => i.productId === listing.id));
  // The listing whose write this card started. Keyed by id, not a flag: a recycled list cell
  // (FlashList) that now shows another listing is not busy.
  const [pendingId, setPendingId] = useState<string | null>(null);

  const toggle = () => {
    const productId = listing.id;
    if (cartWritesInFlight.has(productId)) return;
    const remove = useCartStore.getState().isInCart(productId);
    cartWritesInFlight.add(productId);
    setPendingId(productId);
    const settled = (result: CartWriteResult) => {
      cartWritesInFlight.delete(productId);
      setPendingId((cur) => (cur === productId ? null : cur));
      if (result === 'rejected') return;
      toast.success(remove ? t('product.removedFromCart') : t('product.addedToCart'));
    };
    try {
      if (remove) cart.removeByProductId(productId, settled);
      else cart.add(cartItemFromListing(listing, t('product.seller')), 1, settled);
    } catch (error) {
      // A synchronous failure never leaves the listing locked for the session.
      cartWritesInFlight.delete(productId);
      setPendingId(null);
      throw error;
    }
  };

  return { inCart, isPending: pendingId === listing.id, toggle };
}
