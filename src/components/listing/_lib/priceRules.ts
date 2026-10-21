import type { TFunction } from 'i18next';
import { formatPrice, formatPriceNumber } from '@/utils/format';
import type { PriceLimits } from '@/lib/shared/priceLimits';
import { isTlAmountRefused, parseTlAmount } from '@/lib/shared/tlAmount';
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

/** The prices stored on the loaded listing (API number text); empty or none on create. */
export type PriceBaseline = readonly string[];

/** Whether the candidate amount equals one of the stored prices (the API text is a plain number). */
const isStored = (amount: number, baseline: PriceBaseline | null | undefined): boolean =>
  !!baseline?.some((b) => b !== '' && Number(b) === amount);

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

/**
 * The price field error, read with the shared TL amount parser: text that is not an amount
 * ("1.000" grouping) is refused first, so it is never also reported as below the minimum.
 * Valid, empty, no limits or equal to a stored price -> `null` (the 1 TL minimum is the schema's).
 */
export function priceFieldError(
  t: TFunction,
  value: string,
  limits: PriceLimits,
  baseline?: PriceBaseline | null,
): string | null {
  const parsed = parseTlAmount(value);
  if (parsed.status === 'refused') return t('validation.amountFormatRefused');
  if (parsed.status !== 'ok') return null;
  if (isStored(parsed.amount, baseline)) return null;
  return limitViolation(t, parsed.amount, limits, 'server.product.priceBelowMinimum');
}

/**
 * The discount price error, which blocks the submit. Text that is not an amount comes first:
 * `salePayload` would read it as "no discount" and silently clear the sale (web
 * `saleDataError`). Then the limits (min AND max, the server checks both), only for a discount
 * that will apply (`salePayload`: above 0 and below the price).
 */
export function salePriceFieldError(
  t: TFunction,
  fields: SaleFields,
  limits: PriceLimits,
  baseline?: PriceBaseline | null,
): string | null {
  if (isTlAmountRefused(fields.salePrice)) return t('validation.amountFormatRefused');
  if (limits.minPrice == null && limits.maxPrice == null) return null;
  const sale = salePayload(fields).salePrice;
  if (sale == null) return null;
  if (isStored(sale, baseline)) return null;
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
