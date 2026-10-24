import { QueryClient } from '@tanstack/react-query';
import { qk } from '@/lib/query';
import { invalidateListingCaches, listingCacheKeys } from '../invalidate';

/** Her anahtar için o anahtarın altında bir sorgu kurar; invalidate sonrası hangileri bayatladı? */
function staleAfter(productId?: string) {
  const client = new QueryClient();
  const probes: Record<string, readonly unknown[]> = {
    myListings: qk.products.myListings('active'),
    myStats: qk.products.myListingsStats,
    userStats: qk.user.stats('u1'),
    detail: qk.products.detail('p1'),
    otherDetail: qk.products.detail('p2'),
    productsList: qk.products.list({ q: 'x' }),
    boosted: qk.products.boosted,
    popular: qk.products.popular,
    search: qk.products.search('araba', { a: 1 }),
    featuredCollector: qk.products.featuredCollector,
    featuredBusiness: qk.products.featuredBusiness,
    tradeNew: qk.trades.myTradeable('u1', 'p9'),
    tradeCounter: qk.trades.myTradeableForCounter('u1'),
    tradeSeller: qk.trades.sellerTradeable('u1', 's1'),
    unrelated: qk.orders.all,
  };
  for (const [name, queryKey] of Object.entries(probes)) {
    client.setQueryData(queryKey, name);
  }
  invalidateListingCaches(client, productId);
  return Object.fromEntries(
    Object.entries(probes).map(([name, queryKey]) => [name, client.getQueryState(queryKey)?.isInvalidated ?? false]),
  );
}

describe('invalidateListingCaches — ilan değişince tek paylaşılan küme', () => {
  it('İlanlarım, sayaçlar, detay, genel listeler ve ana sayfa akışları bayatlar', () => {
    const stale = staleAfter('p1');
    expect(stale).toMatchObject({
      myListings: true,
      myStats: true,
      userStats: true,
      detail: true,
      productsList: true,
      boosted: true,
      popular: true,
      search: true,
      featuredCollector: true,
      featuredBusiness: true,
    });
  });

  it('invalidates the trade pickers\' "my tradeable listings" (new trade + counter offer)', () => {
    const stale = staleAfter('p1');
    expect(stale.tradeNew).toBe(true);
    expect(stale.tradeCounter).toBe(true);
    // Other users' listings do not go stale when my listing changes.
    expect(stale.tradeSeller).toBe(false);
  });

  it('productId verilince yalnız o ürünün detayı; ilgisiz anahtar dokunulmaz', () => {
    const stale = staleAfter('p1');
    expect(stale.otherDetail).toBe(false);
    expect(stale.unrelated).toBe(false);
  });

  it('productId yoksa tüm ürün detayları bayatlar', () => {
    const stale = staleAfter();
    expect(stale.detail).toBe(true);
    expect(stale.otherDetail).toBe(true);
  });

  it('anahtarlar qk kaydıyla aynı değerlerdir', () => {
    expect(listingCacheKeys('p1')).toContainEqual(qk.products.detail('p1'));
    expect(listingCacheKeys()).toContainEqual(qk.products.detailAll);
    expect(listingCacheKeys()).toContainEqual(qk.products.all);
  });
});
