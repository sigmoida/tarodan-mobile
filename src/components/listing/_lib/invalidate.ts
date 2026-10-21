import type { QueryClient, QueryKey } from '@tanstack/react-query';
import { qk } from '@/lib/query';

/**
 * Every cache that can go stale when a listing changes (create, edit, deactivate, delete,
 * renew, reopen): ONE set, shared by My listings and the listing form (CLAUDE.md ›
 * Principles). Keys come only from the `qk` registry.
 *
 *  - My listings + counters, profile stats,
 *  - product detail (only that one when `productId` is given, otherwise every detail),
 *  - the general product lists / search / listings screen,
 *  - home feeds (featured collector / business; `products.all` also covers boosted + popular),
 *  - the trade pickers' "my tradeable listings" (new trade + counter offer; the prefix
 *    covers both).
 */
export function listingCacheKeys(productId?: string): QueryKey[] {
  return [
    qk.products.myListingsAll,
    qk.products.myListingsStats,
    qk.user.statsAll,
    productId ? qk.products.detail(productId) : qk.products.detailAll,
    qk.products.all,
    qk.products.searchAll,
    qk.products.featuredCollector,
    qk.products.featuredBusiness,
    qk.trades.myTradeableAll,
  ];
}

export function invalidateListingCaches(queryClient: QueryClient, productId?: string): void {
  for (const queryKey of listingCacheKeys(productId)) {
    queryClient.invalidateQueries({ queryKey });
  }
}
