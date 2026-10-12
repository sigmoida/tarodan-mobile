import { needsDistanceSalesConsent, paymentKindOf, paymentTargetOf, type PaymentTarget } from '../_lib/paymentKind';

describe('paymentKindOf', () => {
  it('rota parametresi yoksa sepet/sipariş: checkout', () => {
    expect(paymentKindOf(undefined, { orderId: 'o1' })).toEqual({
      isMembership: false,
      isBoost: false,
      isPlatformService: false,
      purpose: 'checkout',
    });
  });

  it('üyelik: rota parametresinden ya da durum yanıtından', () => {
    expect(paymentKindOf('membership').purpose).toBe('membership');
    const fromStatus = paymentKindOf(undefined, { orderId: 'o1', isMembershipOrder: true });
    expect(fromStatus).toMatchObject({ isMembership: true, isPlatformService: true, purpose: 'membership' });
  });

  it('öne çıkarma platform hizmetidir ama mağazası pazaryeri (checkout)', () => {
    expect(paymentKindOf('boost')).toEqual({
      isMembership: false,
      isBoost: true,
      isPlatformService: true,
      purpose: 'checkout',
    });
  });
});

describe('paymentTargetOf', () => {
  it('durumdaki hedefi alır; null alanları atlar', () => {
    expect(paymentTargetOf({ orderId: 'o1', checkoutGroupId: null, tradeId: null })).toEqual({ orderId: 'o1' });
    expect(paymentTargetOf({ checkoutGroupId: 'g1' })).toEqual({ checkoutGroupId: 'g1' });
  });

  it('takas id\'si durumda yoksa rota parametresinden', () => {
    expect(paymentTargetOf({}, 't1')).toEqual({ tradeId: 't1' });
    expect(paymentTargetOf({ tradeId: 't2' }, 't1')).toEqual({ tradeId: 't2' });
  });
});

describe('needsDistanceSalesConsent — API kapısıyla aynı kapsam', () => {
  const plain = paymentKindOf(undefined);
  const decide = (target: PaymentTarget, kind = plain, acceptedAtCheckout = false) =>
    needsDistanceSalesConsent({ target, kind, acceptedAtCheckout });

  it('teklif siparişi (tekil sipariş, platform hizmeti değil): ZORUNLU', () => {
    expect(decide({ orderId: 'o1' })).toBe(true);
  });

  it('üyelik / öne çıkarma (origin = platform_service): yok', () => {
    expect(decide({ orderId: 'o1' }, paymentKindOf('membership'))).toBe(false);
    expect(decide({ orderId: 'o1' }, paymentKindOf(undefined, { isMembershipOrder: true }))).toBe(false);
    expect(decide({ orderId: 'o1' }, paymentKindOf('boost'))).toBe(false);
  });

  it('takas ücreti: yok', () => {
    expect(decide({ tradeId: 't1' })).toBe(false);
  });

  it('sepet grubu: checkout\'tan yeni geldiyse yok (onay 3. adımda), sonradan dönülürse ZORUNLU', () => {
    expect(decide({ checkoutGroupId: 'g1' }, plain, true)).toBe(false);
    expect(decide({ checkoutGroupId: 'g1' }, plain, false)).toBe(true);
  });
});
