/**
 * Kayıtlı kart rozetleri — web `SavedCardCard` ile birebir.
 */
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
  it('amaç (mağaza) rozeti yok — web gibi', () => {
    expect(keys({ purpose: 'checkout' })).not.toContain('payment.cardPurposeCheckout');
    expect(keys({ purpose: 'membership', autoRenewEligible: true })).not.toContain('payment.cardPurposeMembership');
  });

  it('"CVV gerektirir" `!autoRenewEligible` iken — `requireCvv`\'den bağımsız (web kuralı)', () => {
    // Web'in bilinen tutarsızlığı birebir: CVV istemeyen sepet kartı da rozeti alır.
    expect(keys({ purpose: 'checkout', requireCvv: false, autoRenewEligible: false })).toEqual(['payment.cvvRequiredBadge']);
    expect(keys({ requireCvv: true, autoRenewEligible: false })).toEqual(['payment.cvvRequiredBadge']);
  });

  it('oto-yenilemeye uygun kart: CVV rozeti yok, oto-yenileme rozeti dijital satış açıkken', () => {
    const card = { purpose: 'membership' as const, autoRenewEligible: true };
    expect(keys(card, true)).toEqual(['payment.autoRenewEligibleBadge']);
    // Apple 2.1(b) / Play: kapalıyken abonelik atfı yok; web'in "değilse CVV" dalına da düşmez.
    expect(keys(card, false)).toEqual([]);
  });

  it('sıra web ile aynı: şema, varsayılan, oto-yenileme/CVV, kurumsal', () => {
    expect(keys({ cardScheme: 'visa', isDefault: true, autoRenewEligible: true, businessCard: true })).toEqual([
      'VISA',
      'payment.defaultCard',
      'payment.autoRenewEligibleBadge',
      'footer.corporate',
    ]);
    expect(keys({ cardScheme: 'visa', isDefault: true, autoRenewEligible: false, businessCard: true })).toEqual([
      'VISA',
      'payment.defaultCard',
      'payment.cvvRequiredBadge',
      'footer.corporate',
    ]);
  });
});
