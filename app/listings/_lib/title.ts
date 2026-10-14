import type { TFunction } from 'i18next';
import type { ProductFilters } from '@/utils/productFilters';
import type { ProductFilterOptions } from '@/hooks/useProductFilterOptions';

/** Popüler ilanlar ön ayarı (ana sayfa "Tümünü gör" → `/listings?sortBy=view_count_desc`). */
export const POPULAR_SORT = 'view_count_desc';

type NameOptions = Partial<Pick<ProductFilterOptions, 'brands' | 'categories' | 'manufacturers'>>;

/** Seçili kimliğin adı: önce filtrenin taşıdığı ad, yoksa seçenek listesinden kimlikle. */
const nameOf = (
  name: string | undefined,
  id: string | undefined,
  list: { id: string; name: string }[] | undefined,
) => name?.trim() || (id ? list?.find((o) => o.id === id)?.name ?? '' : '');

/**
 * İlanlar sayfasının üst bar başlığı — CANLI filtrelerden (URL'den değil): filtre sayfası veya çip
 * ön ayarı değiştirince başlık da değişir. Öncelik: arama → takas vitrini → indirimdekiler →
 * popüler sıralama → marka / kategori / üretici adı → "Tüm İlanlar" (web `ListingsClient` metni).
 */
export function listingsTitle(filters: ProductFilters, t: TFunction, options: NameOptions = {}): string {
  const search = filters.search?.trim();
  if (search) return t('product.searchResultsFor', { query: search });
  if (filters.tradeOnly) return t('nav.tradeShowcase');
  if (filters.discountOnly) return t('product.onSale');
  if (filters.sortBy === POPULAR_SORT) return t('home.popularListings');
  return (
    nameOf(filters.brand, filters.brandId, options.brands) ||
    nameOf(filters.category, filters.categoryId, options.categories) ||
    nameOf(filters.manufacturer, filters.manufacturerId, options.manufacturers) ||
    t('seller.allListings')
  );
}
