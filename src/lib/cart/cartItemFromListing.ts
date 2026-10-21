import type { CartItem } from '@/stores/cartStore';
import { getImageUrl } from '@/utils/imageUrl';
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
    imageUrl: getImageUrl(listing.imageUrl ?? listing.images),
    seller: {
      id: String(listing.sellerId ?? listing.seller?.id ?? 'unknown'),
      displayName: listing.seller?.displayName || sellerFallbackName,
    },
  };
}
