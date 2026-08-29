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

/**
 * Satıcının karşı teklifi: mevcut tekliften YÜKSEK, ürün fiyatından
 * (varsa) DÜŞÜK/eşit olmalı.
 */
export function sellerCounterSchema(refAmount: number, maxPrice: number, t: TFunction) {
  return z.object({
    amount: amountSchema(t)
      .refine(
        (n) => n > refAmount,
        t('offer.counterMustBeHigher', { amount: formatPrice(refAmount) }),
      )
      .refine(
        (n) => maxPrice <= 0 || n <= maxPrice,
        t('offer.counterMustNotExceedPrice', { amount: formatPrice(maxPrice) }),
      ),
  });
}

/** Alıcının karşı teklifi (satıcının counter'ından sonra): satıcı tutarından DÜŞÜK. */
export function buyerCounterSchema(refAmount: number, t: TFunction) {
  return z.object({
    amount: amountSchema(t).refine(
      (n) => n < refAmount,
      t('offer.buyerCounterMustBeLower', { amount: formatPrice(refAmount) }),
    ),
  });
}

export type SellerCounterInput = z.input<ReturnType<typeof sellerCounterSchema>>;
export type BuyerCounterInput = z.input<ReturnType<typeof buyerCounterSchema>>;
