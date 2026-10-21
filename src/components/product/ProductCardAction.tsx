import React from 'react';
import { useAuthStore } from '@/stores/authStore';
import { CAN_BUY_DIGITAL } from '@/lib/purchases';
import { productCardAction, type ProductCardAction } from '@/types';
import type { CartListing } from '@/lib/cart/cartItemFromListing';
import { ProductCardCartButton, type CardActionPresentation } from './ProductCardCartButton';

/** The listing fields the card action reads (the inputs of `productCardAction` plus the cart line). */
export interface ProductCardActionListing extends CartListing {
  status?: string | null;
  isBoosted?: boolean | null;
}

/**
 * The listing card's one action for the current viewer, from the shared rule `productCardAction`
 * (`@/types`, vendored from `@tarodan/types`; web cards use the same rule):
 *
 * | viewer and listing                            | action       |
 * | --------------------------------------------- | ------------ |
 * | guest, or not the seller; active and in stock | cart toggle  |
 * | the seller                                    | none         |
 * | sold, reserved, inactive or out of stock      | none         |
 *
 * Mobile passes `canBoost: CAN_BUY_DIGITAL` (off on both stores, tarodan-ops ADR 0003, 0015), so
 * the seller's own listing gets no button at all: no boost button, no hint, no link to the web.
 * The seller id is `seller.id`, else `sellerId` (web `toProductCardListing`).
 */
export function useProductCardAction(listing: ProductCardActionListing): ProductCardAction {
  const userId = useAuthStore((s) => (s.user?.id != null ? String(s.user.id) : null));
  const sellerId = listing.seller?.id ?? listing.sellerId;
  return productCardAction(
    {
      sellerId: sellerId != null ? String(sellerId) : null,
      status: listing.status ?? null,
      availableQuantity: listing.availableQuantity ?? null,
      isBoosted: listing.isBoosted === true,
    },
    { userId, canBoost: CAN_BUY_DIGITAL },
  );
}

/**
 * The button for a computed action, or nothing. `boost` renders nothing on mobile even if the
 * rule ever returned it: there is no purchase surface for a digital good in the app (ADR 0015).
 */
export function ProductCardActionButton({
  listing,
  action,
  presentation,
}: {
  listing: ProductCardActionListing;
  action: ProductCardAction;
  presentation: CardActionPresentation;
}) {
  switch (action.kind) {
    case 'add_to_cart':
      return <ProductCardCartButton listing={listing} presentation={presentation} />;
    case 'boost':
    case 'none':
      return null;
  }
}
