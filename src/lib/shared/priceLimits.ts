/**
 * İlan fiyat sınırları — admin ayarları `min_product_price` / `max_product_price`
 * (`GET /admin/settings/public`). Web ile aynı kural; sunucu otoritedir ve ihlali
 * zaten reddeder, istemci yalnız önceden doğrulayıp sınırı gösterir.
 *
 * Boş bırakılan ayar yanıtta YOK; eksik / sayı olmayan / pozitif olmayan değer
 * "sınır yok" sayılır (asla formu kilitlemez).
 */

export interface PriceLimits {
  minPrice: number | null;
  maxPrice: number | null;
}

export const NO_PRICE_LIMITS: PriceLimits = { minPrice: null, maxPrice: null };

function limitOf(v: unknown): number | null {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN;
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Ham `GET /admin/settings/public` gövdesinden sınırları çıkarır. */
export function parsePriceLimits(raw: unknown): PriceLimits {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const minPrice = limitOf(o.min_product_price);
  const maxPrice = limitOf(o.max_product_price);
  // Çelişkili ayar (min > max): hangisinin doğru olduğu bilinmez, kilitlemek yerine sınır yok.
  if (minPrice != null && maxPrice != null && minPrice > maxPrice) return NO_PRICE_LIMITS;
  return { minPrice, maxPrice };
}

/**
 * Teklif tutarının alt sınırı: `min(minPrice, ilanın etkin fiyatı)` — taban altı
 * kalmış (eski) ucuz ilanlar pazarlığa açık kalır. Sınır yoksa / fiyat bilinmiyorsa `null`.
 */
export function offerPriceFloor(minPrice: number | null, listPrice: number): number | null {
  if (minPrice == null || !Number.isFinite(listPrice) || listPrice <= 0) return null;
  return Math.min(minPrice, listPrice);
}

/**
 * ALICI tarafının teklif tabanı (yeni teklif / karşı teklif): teklif liste fiyatının
 * ALTINDA olmak zorunda olduğundan, taban liste fiyatına eşit/üstüyse (taban altı kalmış
 * eski ucuz ilan) uygulanmaz — o ilan pazarlığa açık kalır. Bu durumda `null`.
 */
export function buyerOfferFloor(minPrice: number | null, listPrice: number): number | null {
  const floor = offerPriceFloor(minPrice, listPrice);
  return floor != null && floor < listPrice ? floor : null;
}
