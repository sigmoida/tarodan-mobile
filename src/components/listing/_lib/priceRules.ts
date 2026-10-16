import type { TFunction } from 'i18next';
import { formatPrice, formatPriceNumber } from '@/utils/format';
import type { PriceLimits } from '@/lib/shared/priceLimits';
import { salePayload, type SaleFields } from './sale';

/**
 * İlan fiyat sınırı kuralları (admin `min_product_price` / `max_product_price`).
 * Saf ve testlenebilir; form şeması, gönderim kapısı ve satır içi hatalar HEP
 * bunu çağırır (tek kaynak). Sunucu otoritedir — bu yalnız önceden doğrulama.
 *
 * Eski kayıt muafiyeti (grandfather, sunucu ile aynı): aday fiyat, ilanda SAKLI
 * değerlerden (fiyat, eski/orijinal fiyat, indirimli fiyat) herhangi birine eşitse
 * sınır hatası verilmez. Yüklenen kaydın bu değerleri `PriceBaseline` olarak taşınır.
 */

/** Yüklenmiş ilanda saklı fiyat değerleri (form dizgesi); oluşturmada boş / yok. */
export type PriceBaseline = readonly string[];

const isStored = (value: string, baseline: PriceBaseline | null | undefined): boolean =>
  !!baseline?.some((b) => b !== '' && Number(b) === Number(value));

/** Aday tutarın sınır ihlali (min / max); yoksa `null`. Mesajlar sunucu metinleriyle aynı. */
function limitViolation(
  t: TFunction,
  n: number,
  limits: PriceLimits,
  belowKey: 'server.product.priceBelowMinimum' | 'listing.salePriceBelowMinimum',
): string | null {
  if (limits.minPrice != null && n < limits.minPrice) {
    return t(belowKey, { minPrice: formatPriceNumber(limits.minPrice) });
  }
  if (limits.maxPrice != null && n > limits.maxPrice) {
    return t('server.product.priceAboveMaximum', { maxPrice: formatPriceNumber(limits.maxPrice) });
  }
  return null;
}

/** Fiyat alanı hatası; geçerli / boş / sınır yok / saklı değere eşit → `null`. */
export function priceFieldError(
  t: TFunction,
  value: string,
  limits: PriceLimits,
  baseline?: PriceBaseline | null,
): string | null {
  const n = Number(value);
  if (!value.trim() || Number.isNaN(n)) return null; // biçim kuralı şemada
  if (isStored(value, baseline)) return null;
  return limitViolation(t, n, limits, 'server.product.priceBelowMinimum');
}

/**
 * İndirimli fiyat hatası (min VE max — sunucu ikisini de denetler). Yalnız indirim
 * GERÇEKTEN uygulanacaksa (`salePayload`: 0'dan büyük ve fiyattan küçük) denetlenir.
 */
export function salePriceFieldError(
  t: TFunction,
  fields: SaleFields,
  limits: PriceLimits,
  baseline?: PriceBaseline | null,
): string | null {
  if (limits.minPrice == null && limits.maxPrice == null) return null;
  const sale = salePayload(fields).salePrice;
  if (sale == null) return null;
  if (isStored(fields.salePrice, baseline)) return null;
  return limitViolation(t, sale, limits, 'listing.salePriceBelowMinimum');
}

/** Fiyat alanının altındaki yardımcı satır ("En az 250,00 TL"); sınır yoksa `undefined`. */
export function priceLimitHint(t: TFunction, limits: PriceLimits): string | undefined {
  const { minPrice, maxPrice } = limits;
  if (minPrice != null && maxPrice != null) {
    return t('listing.priceRangeHint', { minPrice: formatPrice(minPrice), maxPrice: formatPrice(maxPrice) });
  }
  if (minPrice != null) return t('listing.priceMinHint', { minPrice: formatPrice(minPrice) });
  if (maxPrice != null) return t('listing.priceMaxHint', { maxPrice: formatPrice(maxPrice) });
  return undefined;
}
