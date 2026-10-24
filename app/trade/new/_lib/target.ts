import type { Product } from './types';

/** The listing the trade was started from (`GET /products/:id`), as the wizard reads it. */
export interface TargetListing extends Product {
  seller?: { id?: string } | null;
  sellerId?: string;
}

/** The seller id of the target listing (the nested `seller` first, as the API sends it). */
export const targetSellerOf = (target: TargetListing | null | undefined): string | undefined =>
  target?.seller?.id || target?.sellerId || undefined;

/**
 * The target can be preselected from its own row when the seller's picker has not loaded the
 * page it is on (their side is paged, newest first): only an active, trade-enabled listing of
 * that seller, the same rows the paged list (`tradeOnly`, `status=active`) would return. When
 * every page is loaded and the list still lacks it, the pick is pruned (`usePagedPicks`).
 */
export function isPreselectableTarget(
  target: TargetListing | null | undefined,
  listingId: string,
  sellerId: string,
): target is TargetListing {
  return (
    !!target &&
    target.id === listingId &&
    target.status === 'active' &&
    target.isTradeEnabled === true &&
    !!sellerId &&
    targetSellerOf(target) === sellerId
  );
}
