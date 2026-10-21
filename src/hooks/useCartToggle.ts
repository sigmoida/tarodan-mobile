import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from '@/ui';
import { useCartStore } from '@/stores/cartStore';
import { cartItemFromListing, type CartListing } from '@/lib/cart/cartItemFromListing';
import { useCartSync, type CartWriteResult } from './useCartSync';

/**
 * Add a listing to the cart, or take it out when it is already there: the listing card's cart
 * action (web `useCartToggle`, decision D10). It reads the one local cart (guest and member alike;
 * a member's write is mirrored to the server by `useCartSync`), so it sends no request until
 * pressed.
 *
 * - The in-cart state is a per-listing selector: only this card re-renders when its line changes.
 * - While a member's write runs, another press is ignored (`isPending`), so an add and a remove
 *   never race on the server.
 * - Success shows the web toast ("Ürün sepete eklendi" / "Ürün sepetten çıkarıldı"). A line the
 *   server refuses is undone and its message shown by `useCartSync`; then no success toast.
 */
export function useCartToggle(listing: CartListing) {
  const { t } = useTranslation();
  const cart = useCartSync();
  const inCart = useCartStore((s) => s.items.some((i) => i.productId === listing.id));
  const [isPending, setPending] = useState(false);
  // The ref closes the gap before the re-render: two presses in one frame see the same state.
  const pendingRef = useRef(false);

  const toggle = () => {
    if (pendingRef.current) return;
    const remove = useCartStore.getState().isInCart(listing.id);
    pendingRef.current = true;
    setPending(true);
    const settled = (result: CartWriteResult) => {
      pendingRef.current = false;
      setPending(false);
      if (result === 'rejected') return;
      toast.success(remove ? t('product.removedFromCart') : t('product.addedToCart'));
    };
    if (remove) cart.removeByProductId(listing.id, settled);
    else cart.add(cartItemFromListing(listing, t('product.seller')), 1, settled);
  };

  return { inCart, isPending, toggle };
}
