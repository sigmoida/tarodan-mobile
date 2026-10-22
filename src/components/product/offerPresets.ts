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
 * Liste fiyatından −%5 / −%10 / −%15 teklif tutarları (tam TL'ye yuvarlanır). Geçersiz olanlar
 * düşer: asgari teklifin (%50) altı ya da yuvarlanınca liste fiyatına eşit/üstü (çok düşük fiyatlar);
 * aynı tutara yuvarlanan yüzdelerden yalnız ilki kalır. `floor` (admin fiyat tabanı) altındakiler de düşer.
 * An amount above the API's ceiling of an agreed amount (`TL_NEGOTIATED_AMOUNT_MAX`) is dropped too:
 * the API would refuse it.
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
