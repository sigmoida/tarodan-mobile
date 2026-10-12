import type { TFunction } from 'i18next';
import type { SavedCard } from '@/lib/api';
import { savedCardBadges } from '../_lib/badges';

const t = ((k: string) => k) as unknown as TFunction;

const base: SavedCard = {
  id: 'c1',
  last4: '4242',
  brand: 'Visa',
  expMonth: '12',
  expYear: '30',
  requireCvv: false,
  isDefault: false,
  autoRenewEligible: false,
};

const keys = (card: Partial<SavedCard>, canBuy = true) =>
  savedCardBadges({ ...base, ...card }, t, canBuy).map((b) => b.label);

describe('savedCardBadges', () => {
  it('mağaza rozeti: sepet / üyelik (API delta 20 P2)', () => {
    expect(keys({ purpose: 'checkout' })).toContain('payment.cardPurposeCheckout');
    expect(keys({ purpose: 'membership' })).toContain('payment.cardPurposeMembership');
  });

  it('eski API (purpose yok): mağaza rozeti yok', () => {
    expect(keys({})).toEqual([]);
  });

  it('CVV istemeyen sepet kartı "CVV gerektirir" GÖSTERMEZ (eski ternary hatası)', () => {
    const labels = keys({ purpose: 'checkout', requireCvv: false, autoRenewEligible: false });
    expect(labels).not.toContain('payment.cvvRequiredBadge');
    expect(labels).not.toContain('payment.autoRenewEligibleBadge');
  });

  it('CVV isteyen kart: CVV rozeti', () => {
    expect(keys({ purpose: 'checkout', requireCvv: true })).toContain('payment.cvvRequiredBadge');
  });

  it('üyelik kartı oto-yenilemeye uygun — yalnız dijital satış açıkken', () => {
    const card = { purpose: 'membership' as const, autoRenewEligible: true };
    expect(keys(card, true)).toContain('payment.autoRenewEligibleBadge');
    expect(keys(card, false)).not.toContain('payment.autoRenewEligibleBadge');
    // mağaza rozeti nötr bilgi — iki durumda da var
    expect(keys(card, false)).toContain('payment.cardPurposeMembership');
  });

  it('sıra: şema, varsayılan, mağaza, oto-yenileme, CVV, kurumsal', () => {
    expect(
      keys({
        cardScheme: 'visa',
        isDefault: true,
        purpose: 'membership',
        autoRenewEligible: true,
        requireCvv: true,
        businessCard: true,
      }),
    ).toEqual([
      'VISA',
      'payment.defaultCard',
      'payment.cardPurposeMembership',
      'payment.autoRenewEligibleBadge',
      'payment.cvvRequiredBadge',
      'footer.corporate',
    ]);
  });
});
