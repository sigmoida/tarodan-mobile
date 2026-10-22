// Teklif tutarı kuralları — MakeOfferModal doğrulaması ve hızlı teklif çipleri TEK kaynak.

import { exceedsTlNegotiatedAmountMax } from '@/types';

/** API kuralı (web paritesi): teklif liste fiyatının en az %50'si olmalı. */
export const MIN_OFFER_RATIO = 0.5;

/** Hızlı teklif çiplerinin indirim yüzdeleri. */
export const OFFER_PRESET_PERCENTS = [5, 10, 15] as const;

export interface OfferPreset {
  percent: number;
  /** Tam TL'ye yuvarlanmış teklif tutarı. */
  amount: number;
}

/**
 * Offer amounts at -5% / -10% / -15% of the list price, rounded to whole TL. Invalid ones are
 * dropped: below the minimum offer (50%), or equal to or above the list price once rounded (very
 * low prices); of percentages that round to the same amount only the first stays. Amounts below
 * `floor` (the admin price floor) are dropped too, and so is an amount above the API's ceiling of
 * an agreed amount (`TL_NEGOTIATED_AMOUNT_MAX`): the API would refuse it.
 */
export function offerPresets(listPrice: number, floor: number | null = null): OfferPreset[] {
  if (!Number.isFinite(listPrice) || listPrice <= 0) return [];
  const seen = new Set<number>();
  const out: OfferPreset[] = [];
  for (const percent of OFFER_PRESET_PERCENTS) {
    const amount = Math.round((listPrice * (100 - percent)) / 100);
    if (amount <= 0 || amount >= listPrice || amount < listPrice * MIN_OFFER_RATIO) continue;
    if (floor != null && amount < floor) continue; // admin fiyat tabanının altı
    if (exceedsTlNegotiatedAmountMax(amount)) continue;
    if (seen.has(amount)) continue;
    seen.add(amount);
    out.push({ percent, amount });
  }
  return out;
}
