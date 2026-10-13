/**
 * Ödeme durumlarının tek kaynağı (`status.ts`): kart formu, başarı ekranı ve
 * yetki belirteci temizliği aynı listeyi kullanır.
 */
import {
  FINAL_PAYMENT_STATUSES,
  isFailedPaymentStatus,
  isFinalPaymentStatus,
  isPaidPaymentStatus,
  PAID_PAYMENT_STATUSES,
} from '../status';

describe('ödendi durumları', () => {
  it.each(['completed', 'paid', 'success', 'hold_payment'])('%s → ödendi', (status) => {
    expect(isPaidPaymentStatus(status)).toBe(true);
  });

  it.each(['pending', 'processing', 'failed', 'refunded', 'cancelled', '', undefined, null, 1])(
    '%s → ödendi değil',
    (status) => {
      expect(isPaidPaymentStatus(status)).toBe(false);
    },
  );
});

describe('kesin durumlar', () => {
  it('her ödendi durumu kesindir', () => {
    for (const status of PAID_PAYMENT_STATUSES) expect(FINAL_PAYMENT_STATUSES.has(status)).toBe(true);
  });

  it.each(['refunded', 'cancelled'])('%s → kesin', (status) => {
    expect(isFinalPaymentStatus(status)).toBe(true);
  });

  it.each(['pending', 'processing', undefined, null, {}])('%s → kesin değil', (status) => {
    expect(isFinalPaymentStatus(status)).toBe(false);
  });

  it('failed kesin DEĞİL: retry aynı ödemeyi failed → pending yapar (aynı belirteçle ikinci deneme)', () => {
    expect(isFinalPaymentStatus('failed')).toBe(false);
  });
});

it('başarısız durumu yalnız failed', () => {
  expect(isFailedPaymentStatus('failed')).toBe(true);
  for (const status of ['pending', 'completed', 'cancelled', undefined]) expect(isFailedPaymentStatus(status)).toBe(false);
});
