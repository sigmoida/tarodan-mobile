/**
 * Ödeme ekranı "kartımı kaydet (oto-yenileme)" kutusunu genel `recurringEnabled`
 * bayrağına göre açıyordu. Canlı yapılandırmada (2026-09-29) genel bayrak `true`
 * ama ürün ödemesi için `purposes.checkout.recurringEnabled: false` — fiziksel
 * ürün alan herkes (App Review dahil) bir abonelik ifadesi görüyordu.
 */
import { isRecurringEnabledFor } from '../recurring';

const LIVE = {
  bypassEnabled: false,
  cardStorageEnabled: true,
  recurringEnabled: true,
  purposes: {
    checkout: { cardStorageEnabled: true, recurringEnabled: false },
    membership: { cardStorageEnabled: true, recurringEnabled: true },
  },
};

describe('isRecurringEnabledFor', () => {
  it('ürün ödemesinde amaç bayrağını okur — genel bayrak değil', () => {
    expect(isRecurringEnabledFor(LIVE, 'checkout')).toBe(false);
  });

  it('üyelik ödemesinde açık', () => {
    expect(isRecurringEnabledFor(LIVE, 'membership')).toBe(true);
  });

  it('amaç tanımlı değilse genel bayrağa düşer (eski sunucu)', () => {
    expect(isRecurringEnabledFor({ recurringEnabled: true }, 'checkout')).toBe(true);
    expect(isRecurringEnabledFor(LIVE, 'boost')).toBe(true);
  });

  it('yapılandırma yoksa kapalı', () => {
    expect(isRecurringEnabledFor(null, 'checkout')).toBe(false);
  });
});
