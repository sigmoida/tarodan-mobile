import type { ProductCardProduct } from '@/components/product';
import type { CollectionItemSummary } from '@/types';

/** Listing statuses a collection keeps showing (web `sortCollectionItems`); others are hidden or deleted. */
const SHOWN_LISTING_STATUSES = ['active', 'sold', 'reserved', 'inactive'];

/**
 * Visible and ordered items (web `sortCollectionItems`): hidden and deleted listings are dropped, but
 * sold and reserved ones stay (with the "Satıldı" badge) so a collection never looks empty after a
 * sale. Featured items come first, then `sortOrder`.
 */
export function sortCollectionItems(items: readonly CollectionItemSummary[] | null | undefined): CollectionItemSummary[] {
  if (!items) return [];
  return items
    .filter((item) => item.isCustom || !item.productStatus || SHOWN_LISTING_STATUSES.includes(item.productStatus))
    .sort((a, b) => {
      if (a.isFeatured && !b.isFeatured) return -1;
      if (!a.isFeatured && b.isFeatured) return 1;
      return a.sortOrder - b.sortOrder;
    });
}

/**
 * The one not-for-sale rule (web `isNotForSale`): a custom item (`isCustom`, which the API always
 * sets) is not a listing, has no price and is not for sale.
 */
export function isNotForSale(item: CollectionItemSummary): boolean {
  return item.isCustom;
}

export interface CollectionItemCard {
  product: ProductCardProduct;
  /** A custom item (not a listing): no price ("Satışta değil"), the "Koleksiyon" badge, not tappable. */
  isCustom: boolean;
  /** Opens its listing on a tap (web: a card link only when there is a `productId`). */
  isListing: boolean;
  /** A sold listing: the "Satıldı" badge instead of the out-of-stock overlay (web). */
  isSold: boolean;
}

/**
 * A collection item (listing or custom item) as the shared `ProductCard` input, the same mapping as
 * web `itemToProduct`. `status` is left off on purpose: a sold listing gets the badge, not the
 * out-of-stock treatment. A custom item has no price; the card shows `collection.notForSale` in its
 * price row, so the placeholder `price` below is never displayed.
 */
export function toCollectionItemCard(item: CollectionItemSummary, fallbackTitle: string): CollectionItemCard {
  const isSold = item.productStatus === 'sold';
  const title = item.isCustom ? item.customTitle || item.productTitle : item.productTitle;
  return {
    product: {
      id: String(item.productId ?? item.id),
      title: title || fallbackTitle,
      price: item.productPrice ?? 0,
      imageUrl: item.customImageUrl || item.productImage || null,
      // The viewer's own listing gets no heart (`useProductCardFavorites`).
      sellerId: item.sellerId ?? null,
      isBoosted: Boolean(item.isBoosted) && !isSold,
    },
    isCustom: isNotForSale(item),
    isListing: !!item.productId,
    isSold,
  };
}
