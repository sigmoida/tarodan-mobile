/**
 * `POST /payments/direct-form` gövdesi — para akışı payload testi.
 * API: `payment/dto/direct-payment.dto.ts` (`distanceSalesAccepted`, `saveCard`,
 * `savedCardId`; hedef `orderId | checkoutGroupId | tradeId`).
 */
import { buildDirectFormBody } from '../directFormBody';

describe('buildDirectFormBody', () => {
  it('teklif siparişi + yeni kart + onay: hedef, saveCard ve distanceSalesAccepted: true', () => {
    expect(
      buildDirectFormBody({
        target: { orderId: 'order-1' },
        card: { kind: 'new', save: true },
        distanceSalesAccepted: true,
      }),
    ).toEqual({ orderId: 'order-1', saveCard: true, distanceSalesAccepted: true });
  });

  it('kayıtlı kart + onay: savedCardId gider, saveCard GİTMEZ', () => {
    expect(
      buildDirectFormBody({
        target: { orderId: 'order-1' },
        card: { kind: 'saved', id: 'card-9' },
        distanceSalesAccepted: true,
      }),
    ).toEqual({ orderId: 'order-1', savedCardId: 'card-9', distanceSalesAccepted: true });
  });

  it('onay verilmezse (undefined) alan HİÇ gönderilmez — saf üretici', () => {
    const body = buildDirectFormBody({ target: { tradeId: 't-1' }, card: { kind: 'new', save: false } });
    expect(body).toEqual({ tradeId: 't-1', saveCard: false });
    expect(body).not.toHaveProperty('distanceSalesAccepted');
  });

  it('kart saklama kapalı: saveCard açıkça false (gönderilmezse sunucu üyelikte saklar)', () => {
    expect(buildDirectFormBody({ target: { orderId: 'o' }, card: { kind: 'new', save: false } })).toEqual({
      orderId: 'o',
      saveCard: false,
    });
  });

  it('sepet grubu hedefi olduğu gibi taşınır', () => {
    expect(
      buildDirectFormBody({
        target: { checkoutGroupId: 'g-1' },
        card: { kind: 'new', save: true },
        distanceSalesAccepted: true,
      }),
    ).toEqual({ checkoutGroupId: 'g-1', saveCard: true, distanceSalesAccepted: true });
  });

  it('paymentId gövdeye girer (web `useCardPayment`; misafirde capability ile zorunlu)', () => {
    expect(
      buildDirectFormBody({
        target: { checkoutGroupId: 'g-1' },
        paymentId: 'pay-1',
        card: { kind: 'saved', id: 'card-9' },
        distanceSalesAccepted: true,
      }),
    ).toEqual({ checkoutGroupId: 'g-1', paymentId: 'pay-1', savedCardId: 'card-9', distanceSalesAccepted: true });
    expect(buildDirectFormBody({ target: { orderId: 'o' }, card: { kind: 'new', save: false } })).not.toHaveProperty(
      'paymentId',
    );
  });

  it('gövdede kart verisi alanı yok', () => {
    const body = buildDirectFormBody({ target: { orderId: 'o' }, card: { kind: 'new', save: true }, distanceSalesAccepted: true });
    const keys = Object.keys(body).join(',').toLowerCase();
    for (const forbidden of ['card_number', 'cc_owner', 'cvv', 'expiry']) expect(keys).not.toContain(forbidden);
  });

  describe('installment (ADR 0019)', () => {
    it('absent = single payment: no field at all', () => {
      const body = buildDirectFormBody({ target: { orderId: 'o' }, card: { kind: 'new', save: false }, installment: undefined });
      expect(body).not.toHaveProperty('installment');
    });

    it('new card: count, expectedTotal and only the 8-digit BIN; never the card number', () => {
      const body = buildDirectFormBody({
        target: { orderId: 'o' },
        paymentId: 'pay-1',
        card: { kind: 'new', save: false },
        distanceSalesAccepted: true,
        installment: { count: 3, bin: '45467112', expectedTotal: 1066.38 },
      });
      expect(body).toEqual({
        orderId: 'o',
        paymentId: 'pay-1',
        saveCard: false,
        distanceSalesAccepted: true,
        installment: { count: 3, bin: '45467112', expectedTotal: 1066.38 },
      });
      // No run of 9+ digits anywhere in the body (a BIN is at most 8).
      expect(JSON.stringify(body)).not.toMatch(/\d{9,}/);
    });

    it('saved card: savedCardId and the count, no BIN', () => {
      expect(
        buildDirectFormBody({
          target: { checkoutGroupId: 'g-1' },
          card: { kind: 'saved', id: 'card-9' },
          installment: { count: 6, expectedTotal: 1120 },
        }),
      ).toEqual({ checkoutGroupId: 'g-1', savedCardId: 'card-9', installment: { count: 6, expectedTotal: 1120 } });
    });
  });
});
