/**
 * Katalog varlığının (üretici / marka) aktif ilan sayısı — tek kaynak.
 *
 * `/manufacturers` listesi sayıyı `_count.products` olarak, detay uçları `productCount` olarak
 * döndürür. Karar (web + mobil): ilanı olmayan üretici/marka listelerde GÖSTERİLMEZ — boş
 * sayfaya götüren bir kutu kullanıcıyı yanıltıyor.
 */
export interface ListingCountCarrier {
  _count?: { products?: number | null } | null;
  productCount?: number | null;
}

/** Aktif ilan sayısı; alan yoksa 0. */
export function listingCount(m: ListingCountCarrier | null | undefined): number {
  return m?._count?.products ?? m?.productCount ?? 0;
}

/** İlanı olan varlık mı? Liste süzgeci olarak kullanılır (`list.filter(hasListings)`). */
export function hasListings(m: ListingCountCarrier | null | undefined): boolean {
  return listingCount(m) > 0;
}

/** react-query `select` için sabit referanslı süzgeç (her render'da yeni dizi üretmesin). */
export function selectWithListings<T extends ListingCountCarrier>(list: T[]): T[] {
  return list.filter(hasListings);
}
