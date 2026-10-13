import { buildDirectFormBody, type DirectFormTarget } from '@/lib/payment/directFormBody';
import { paymentKindOf, paymentTargetOf } from '../_lib/paymentKind';

describe('paymentKindOf', () => {
  it('rota parametresi yoksa sepet/sipariş: checkout', () => {
    expect(paymentKindOf(undefined, { orderId: 'o1' })).toEqual({
      isMembership: false,
      isBoost: false,
      purpose: 'checkout',
    });
  });

  it('üyelik: rota parametresinden ya da durum yanıtından', () => {
    expect(paymentKindOf('membership').purpose).toBe('membership');
    const fromStatus = paymentKindOf(undefined, { orderId: 'o1', isMembershipOrder: true });
    expect(fromStatus).toMatchObject({ isMembership: true, purpose: 'membership' });
  });

  it('öne çıkarmanın mağazası pazaryeri (checkout)', () => {
    expect(paymentKindOf('boost')).toEqual({
      isMembership: false,
      isBoost: true,
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

describe('tek hedef tipi (DirectFormTarget)', () => {
  it('durumdan türetilen hedef olduğu gibi direct-form gövdesine girer', () => {
    const target: DirectFormTarget = paymentTargetOf({ checkoutGroupId: 'g1', orderId: null }, undefined);
    expect(buildDirectFormBody({ target, paymentId: 'p1', card: { kind: 'new', save: false } })).toEqual({
      checkoutGroupId: 'g1',
      paymentId: 'p1',
      saveCard: false,
    });
  });
});
