import type { CartItem } from '@/stores/cartStore';
import { resolveImageUrl } from '@/utils/imageUrl';
import { asLabel } from '@/utils/format';
import { getProductEffectivePrice, type ProductPriceFields } from '@/utils/productPrice';

/** The listing fields a list card has, enough to put the listing in the local cart. */
export interface CartListing extends ProductPriceFields {
  id: string;
  title: string;
  images?: unknown;
  imageUrl?: string | null;
  availableQuantity?: number | null;
  quantity?: number | null;
  maxQuantityPerOrder?: number | null;
  brand?: unknown;
  scale?: unknown;
  sellerId?: string | null;
  seller?: { id?: string | null; displayName?: string | null } | null;
}

/**
 * The local cart line for a listing card's "add to cart" (`useCartToggle`). The price shown in the
 * cart and charged at checkout always comes from the server quote; the line only carries the
 * display fields and the stock caps (`maxAllowedQty`), like the product detail's line.
 */
export function cartItemFromListing(
  listing: CartListing,
  sellerFallbackName: string,
): Omit<CartItem, 'id' | 'quantity' | 'addedAt'> {
  return {
    productId: listing.id,
    title: listing.title,
    price: getProductEffectivePrice(listing),
    stock: listing.availableQuantity ?? listing.quantity ?? null,
    maxQuantityPerOrder: listing.maxQuantityPerOrder ?? null,
    imageUrl: resolveImageUrl(listing.imageUrl ?? listing.images),
    brand: asLabel(listing.brand, ''),
    scale: asLabel(listing.scale, ''),
    seller: {
      // The same seller id as the card action (`seller.id`, else `sellerId`; web `toProductCardListing`).
      id: String(listing.seller?.id ?? listing.sellerId ?? 'unknown'),
      displayName: listing.seller?.displayName || sellerFallbackName,
    },
  };
}
