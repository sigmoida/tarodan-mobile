/**
 * `toExpectedPricing` — quote yanıtından sipariş gövdesine giden fiyat imzasının
 * TEK türeticisi. Delta 18 ile alan sayısı ikiden dörde çıktı; dört payload
 * üreticisine alan alan dağıtmak yerine burada toplanır.
 *
 * Eksik alan `null` döndürür: undefined/0 göndermek yalnız aynı 400'ü başka bir
 * şekilde üretirdi (mevcut `pricingHash` kapısıyla aynı gerekçe).
 */
import { toExpectedPricing, type OrderQuoteResponse } from '../orders';

const FULL = {
  pricingHash: '70a8bdadff29af70',
  shippingTariffVersion: 4,
  commissionRuleSetId: '11111111-2222-3333-4444-555555555555',
  commissionRuleSetVersion: 7,
} as OrderQuoteResponse;

describe('toExpectedPricing', () => {
  it('dört alanı da expected* adlarıyla taşır', () => {
    expect(toExpectedPricing(FULL)).toEqual({
      expectedPricingHash: '70a8bdadff29af70',
      expectedShippingTariffVersion: 4,
      expectedCommissionRuleSetId: '11111111-2222-3333-4444-555555555555',
      expectedCommissionRuleSetVersion: 7,
    });
  });

  it('komisyon seti eksikse null döner (yarım gövde göndermez)', () => {
    const { commissionRuleSetId, ...withoutId } = FULL as any;
    expect(toExpectedPricing(withoutId)).toBeNull();
  });

  it('sürüm sayı değilse null döner', () => {
    expect(toExpectedPricing({ ...FULL, commissionRuleSetVersion: null } as any)).toBeNull();
  });

  it('shippingTariffVersion 0 geçerli bir sürümdür — null DÖNMEZ', () => {
    expect(toExpectedPricing({ ...FULL, shippingTariffVersion: 0 })).not.toBeNull();
  });
});
