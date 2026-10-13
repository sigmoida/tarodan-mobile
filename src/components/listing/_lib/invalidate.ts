import type { QueryClient, QueryKey } from '@tanstack/react-query';
import { qk } from '@/lib/query';

/**
 * Bir ilan değişince (düzenle / pasife al / sil / yenile / yeniden aç) bayat
 * kalabilecek TÜM önbellekler — TEK küme; İlanlarım ile düzenleme formu aynısını
 * kullanır (CLAUDE.md §5). Anahtarlar yalnız `qk` kaydından gelir.
 *
 *  - İlanlarım listesi + sayaçlar, profil istatistikleri,
 *  - ürün detayı (`productId` verilirse yalnız o, yoksa tüm detaylar),
 *  - genel ürün listeleri / arama / ilanlar ekranı,
 *  - ana sayfa akışları (öne çıkan koleksiyoncu / işletme; `products.all` boost+popüler'i de kapsar).
 */
export function listingCacheKeys(productId?: string): QueryKey[] {
  return [
    qk.products.myListingsAll,
    qk.products.myListingsStats,
    qk.user.statsAll,
    productId ? qk.products.detail(productId) : qk.products.detailAll,
    qk.products.all,
    qk.products.searchAll,
    qk.products.listingsAll,
    qk.products.featuredCollector,
    qk.products.featuredBusiness,
  ];
}

export function invalidateListingCaches(queryClient: QueryClient, productId?: string): void {
  for (const queryKey of listingCacheKeys(productId)) {
    queryClient.invalidateQueries({ queryKey });
  }
}
