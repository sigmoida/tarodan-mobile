import type { TFunction } from 'i18next';
import { formatPrice, formatPriceNumber } from '@/utils/format';
import type { PriceLimits } from '@/lib/shared/priceLimits';
import { salePayload, type SaleFields } from './sale';

/**
 * İlan fiyat sınırı kuralları (admin `min_product_price` / `max_product_price`).
 * Saf ve testlenebilir; form şeması, gönderim kapısı ve satır içi hatalar HEP
 * bunu çağırır (tek kaynak). Sunucu otoritedir — bu yalnız önceden doğrulama.
 *
 * Eski kayıt muafiyeti (grandfather): düzenlemede alanın yüklenen ilk değeri
 * (`initial`) taban altında olabilir; satıcı DEĞİŞTİRMEDİKÇE hata verilmez.
 */

/** Yüklenmiş ilanın ilk fiyat / indirimli fiyat değeri (form dizgesi); oluşturmada `null`. */
export interface PriceBaseline {
  price: string;
  salePrice: string;
}

const unchanged = (value: string, initial: string | null | undefined): boolean =>
  initial != null && initial !== '' && Number(value) === Number(initial);

/** Fiyat alanı hatası; geçerli / boş / sınır yok / değiştirilmemiş eski fiyat → `null`. */
export function priceFieldError(
  t: TFunction,
  value: string,
  limits: PriceLimits,
  initial?: string | null,
): string | null {
  const n = Number(value);
  if (!value.trim() || Number.isNaN(n)) return null; // biçim kuralı şemada
  if (unchanged(value, initial)) return null;
  if (limits.minPrice != null && n < limits.minPrice) {
    return t('server.product.priceBelowMinimum', { minPrice: formatPriceNumber(limits.minPrice) });
  }
  if (limits.maxPrice != null && n > limits.maxPrice) {
    return t('server.product.priceAboveMaximum', { maxPrice: formatPriceNumber(limits.maxPrice) });
  }
  return null;
}

/**
 * İndirimli fiyat hatası. Yalnız indirim GERÇEKTEN uygulanacaksa (`salePayload`:
 * 0'dan büyük ve fiyattan küçük) denetlenir — uygulanmayacak değer taban ihlali değildir.
 */
export function salePriceFieldError(
  t: TFunction,
  fields: SaleFields,
  limits: PriceLimits,
  initialSalePrice?: string | null,
): string | null {
  if (limits.minPrice == null) return null;
  const sale = salePayload(fields).salePrice;
  if (sale == null) return null;
  if (unchanged(fields.salePrice, initialSalePrice)) return null;
  if (sale < limits.minPrice) {
    return t('listing.salePriceBelowMinimum', { minPrice: formatPriceNumber(limits.minPrice) });
  }
  return null;
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
