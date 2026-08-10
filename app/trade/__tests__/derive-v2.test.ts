/**
 * derive-v2 · takas v2 ödeme modeli (delta 17 §1).
 *
 * `pricingVersion` yanıt DTO'sunda YOK. İSTEMCİ İKİ SİNYALLE anlar:
 *   1. kabul sonrası `cashPayments.length >= 2`
 *   2. kabul öncesi `payment-quote` boş olmayan gövde
 * 2026-08-09 ölçümü ikinci sinyalin şart olduğunu gösterdi: `rejected` bir v2
 * takas 0 satırlıydı ama dolu quote döndürdü. Tek satırlı + `commission > 0`
 * olan kayıt v1'dir. Eldeki v1 takaslar açıldıkları modelle biteceği için iki
 * görünüm de yaşar; ayrım BURADA, tek yerde yapılır.
 */
import { deriveTradeView } from '../[id]/_lib/derive';
import type { Trade } from '../[id]/_lib/types';

const ME = { id: 'u1' };
const QUOTE = {
  initiator: { serviceFee: 200, shipping: 200, cashDifference: 0, total: 400 },
  receiver: { serviceFee: 200, shipping: 200, cashDifference: 500, total: 900 },
} as any;

const BASE = {
  id: 't1',
  initiatorId: 'u1',
  receiverId: 'u2',
  initiatorName: 'Ben',
  receiverName: 'Karşı',
  status: 'awaiting_payment',
  items: [],
  shipments: [],
} as unknown as Trade;

const V2 = {
  ...BASE,
  cashPayments: [
    { id: 'c1', payerId: 'u1', recipientId: null, amount: 0, tradeFeeAmount: 120, shippingAmount: 190, commission: 0, totalAmount: 310, status: 'completed' },
    { id: 'c2', payerId: 'u2', recipientId: 'u1', amount: 500, tradeFeeAmount: 120, shippingAmount: 190, commission: 0, totalAmount: 810, status: 'pending' },
  ],
} as unknown as Trade;

// v1: TEK satır + commission > 0 + tradeFee/shipping sıfır (staging `12012f5e`).
const V1 = {
  ...BASE,
  cashCommission: 7.5,
  cashPayment: { id: 'c1', payerId: 'u1', amount: 150, commission: 7.5, tradeFeeAmount: 0, shippingAmount: 0, totalAmount: 157.5, status: 'pending' },
  cashPayments: [
    { id: 'c1', payerId: 'u1', recipientId: 'u2', amount: 150, tradeFeeAmount: 0, shippingAmount: 0, commission: 7.5, totalAmount: 157.5, status: 'pending' },
  ],
} as unknown as Trade;

describe('deriveTradeView — v1/v2 ayrımı', () => {
  it('iki ödeme satırı varsa quote olmadan da v2 sayar', () => {
    expect(deriveTradeView(V2, ME, null).isV2).toBe(true);
  });

  it('tek satır + commission > 0 ise v1 kalır', () => {
    expect(deriveTradeView(V1, ME, null).isV2).toBe(false);
  });

  it('kabul EDİLMEMİŞ v2 takas: 0 satır ama dolu quote → v2 sayar', () => {
    // 2026-08-09 ölçümü: `rejected` v2 takas 0 satırlı, quote'u dolu.
    expect(deriveTradeView(BASE, ME, QUOTE).isV2).toBe(true);
  });

  it('0 satır + quote yok → v1 kalır (güvenli taraf)', () => {
    expect(deriveTradeView(BASE, ME, null).isV2).toBe(false);
  });

  it('quote henüz yüklenmemişken 2 satır yine v2 der (yanıp sönme yok)', () => {
    expect(deriveTradeView(V2, ME, undefined).isV2).toBe(true);
  });
});

describe('deriveTradeView — ödeme satırları', () => {
  it('kendi satırımı payerId ile bulur', () => {
    const v = deriveTradeView(V2, ME, null);
    expect(v.myPaymentRow?.id).toBe('c1');
    expect(v.theirPaymentRow?.id).toBe('c2');
  });

  it('kendi satırım completed ise bekleyen saymaz', () => {
    expect(deriveTradeView(V2, ME, null).myPaymentPending).toBe(false);
  });

  it('karşı taraf öderken 1/2 sayar', () => {
    const v = deriveTradeView(V2, ME, null);
    expect(v.paidCount).toBe(1);
    expect(v.totalCount).toBe(2);
  });

  it('kullanıcı yoksa satır çözmez ama patlamaz', () => {
    const v = deriveTradeView(V2, null, null);
    expect(v.myPaymentRow).toBeNull();
    expect(v.isV2).toBe(true);
  });
});
