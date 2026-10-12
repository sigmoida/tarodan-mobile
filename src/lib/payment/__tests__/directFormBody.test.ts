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

  it('onay kutusu gösterilmediyse (takas / üyelik / checkout\'tan gelen grup) alan HİÇ gönderilmez', () => {
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

  it('gövdede kart verisi alanı yok', () => {
    const body = buildDirectFormBody({ target: { orderId: 'o' }, card: { kind: 'new', save: true }, distanceSalesAccepted: true });
    const keys = Object.keys(body).join(',').toLowerCase();
    for (const forbidden of ['card_number', 'cc_owner', 'cvv', 'expiry']) expect(keys).not.toContain(forbidden);
  });
});
