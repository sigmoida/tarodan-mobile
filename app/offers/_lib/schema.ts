// Karşı teklif modallarının zod şemaları (colocated).
// Sınırlar runtime'da (mevcut teklif tutarı / ürün fiyatı) belli olduğundan
// şemalar bir factory ile üretilir. Form değerleri string girer (`z.input`),
// `handleSubmit` sayı üretir (`z.output`).
import type { TFunction } from 'i18next';
import { z } from 'zod';
import { formatPrice } from './status';

function amountSchema(t: TFunction) {
  return z
    .string()
    .trim()
    .transform((s) => parseFloat(s.replace(',', '.')))
    .refine((n) => !Number.isNaN(n) && n > 0, t('validation.enterValidAmount'));
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
