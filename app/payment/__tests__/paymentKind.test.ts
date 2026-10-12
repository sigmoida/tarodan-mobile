import { paymentKindOf, paymentTargetOf } from '../_lib/paymentKind';

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
