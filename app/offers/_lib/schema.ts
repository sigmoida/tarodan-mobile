// Zod schemas of the counter-offer modals (colocated). The bounds are known only at runtime
// (the current offer amount, the product price), so the schemas come from factories. The form
// value is the field text (`z.input`); `handleSubmit` yields the amount (`z.output`).
import type { TFunction } from 'i18next';
import { z } from 'zod';
import { parseTlAmount } from '@/lib/shared/tlAmount';
import { formatPrice } from './status';

/**
 * The typed amount, read by the shared TL amount parser like web: grouping such as "1.000" is
 * refused (`validation.amountFormatRefused`), never read as 1 TL; blank or zero text is no amount.
 * Both stop the field here (`fatal`), so no bound is checked against a value that is not there.
 */
function amountSchema(t: TFunction) {
  return z.string().transform((text, ctx) => {
    const parsed = parseTlAmount(text);
    if (parsed.status === 'ok') return parsed.amount;
    ctx.addIssue({
      code: 'custom',
      message: parsed.status === 'refused' ? t('validation.amountFormatRefused') : t('validation.enterValidAmount'),
      fatal: true,
    });
    return z.NEVER;
  });
}

/** Admin fiyat tabanı (`min_product_price`) teklif alt sınırı: `floor` yoksa kural yok. */
const belowFloorMessage = (floor: number | null, t: TFunction) =>
  floor == null ? '' : t('offer.counterBelowFloor', { amount: formatPrice(floor) });

/**
 * Satıcının karşı teklifi: mevcut tekliften YÜKSEK, ürün fiyatından
 * (varsa) DÜŞÜK/eşit, `floor` (varsa) altında olmamalı.
 */
export function sellerCounterSchema(
  refAmount: number,
  maxPrice: number,
  t: TFunction,
  floor: number | null = null,
) {
  return z.object({
    amount: amountSchema(t)
      .refine(
        (n) => n > refAmount,
        t('offer.counterMustBeHigher', { amount: formatPrice(refAmount) }),
      )
      .refine(
        (n) => maxPrice <= 0 || n <= maxPrice,
        t('offer.counterMustNotExceedPrice', { amount: formatPrice(maxPrice) }),
      )
      .refine((n) => floor == null || n >= floor, belowFloorMessage(floor, t)),
  });
}

/**
 * Alıcının karşı teklifi (satıcının counter'ından sonra): satıcı tutarından DÜŞÜK,
 * `floor` (varsa) altında olmamalı.
 */
export function buyerCounterSchema(refAmount: number, t: TFunction, floor: number | null = null) {
  return z.object({
    amount: amountSchema(t)
      .refine(
        (n) => n < refAmount,
        t('offer.buyerCounterMustBeLower', { amount: formatPrice(refAmount) }),
      )
      .refine((n) => floor == null || n >= floor, belowFloorMessage(floor, t)),
  });
}

export type SellerCounterInput = z.input<ReturnType<typeof sellerCounterSchema>>;
export type BuyerCounterInput = z.input<ReturnType<typeof buyerCounterSchema>>;
