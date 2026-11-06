/**
 * API delta 20: kart saklama ödeme AMACINA göre (`purposes.<amaç>.cardStorageEnabled`).
 *
 * Eski yardımcı `recurringEnabled`'a bakıyordu: pazaryeri mağazasında recurring
 * hep kapalı olduğu için sepet ödemesinde kayıtlı kart HİÇ görünmüyordu. Daha
 * eski bir sürüm de genel `recurringEnabled`'ı okuyup ürün ödemesinde
 * "oto-yenileme için kaydet" diyordu (canlı yapılandırma 2026-09-29).
 */
import { installmentsConfigOf, paymentCapabilities, SAFE_PAYMENT_CONFIG } from '../capabilities';

const LIVE = {
  bypassEnabled: false,
  cardStorageEnabled: true,
  recurringEnabled: true,
  purposes: {
    checkout: { cardStorageEnabled: true, recurringEnabled: false },
    membership: { cardStorageEnabled: true, recurringEnabled: true },
  },
};

describe('paymentCapabilities', () => {
  it('sepet: kart saklama açık, recurring kapalı — amaç bayrağı okunur', () => {
    expect(paymentCapabilities(LIVE, 'checkout')).toEqual({ cardStorageEnabled: true, recurringEnabled: false });
  });

  it('üyelik: kendi mağazasının bayrakları', () => {
    expect(paymentCapabilities(LIVE, 'membership')).toEqual({ cardStorageEnabled: true, recurringEnabled: true });
  });

  it('amaç bayrağı üst düzeyi ezer (sepette saklama kapalı, üst düzey açık olsa da)', () => {
    const cfg = {
      ...LIVE,
      purposes: { ...LIVE.purposes, checkout: { cardStorageEnabled: false, recurringEnabled: false } },
    };
    expect(paymentCapabilities(cfg, 'checkout').cardStorageEnabled).toBe(false);
  });

  it('`purposes` yoksa (eski API) üst düzey alanlara düşer — web ile aynı', () => {
    const legacy = { bypassEnabled: false, cardStorageEnabled: true, recurringEnabled: false };
    expect(paymentCapabilities(legacy, 'checkout')).toEqual({ cardStorageEnabled: true, recurringEnabled: false });
    expect(paymentCapabilities(legacy, 'membership')).toEqual({ cardStorageEnabled: true, recurringEnabled: false });
  });

  it('yapılandırma yoksa / güvenli varsayılan: her şey kapalı', () => {
    expect(paymentCapabilities(null, 'checkout')).toEqual({ cardStorageEnabled: false, recurringEnabled: false });
    expect(paymentCapabilities(SAFE_PAYMENT_CONFIG, 'membership')).toEqual({
      cardStorageEnabled: false,
      recurringEnabled: false,
    });
  });
});

describe('installmentsConfigOf (ADR 0019, fail closed)', () => {
  it('reads the switch and the minimum', () => {
    expect(installmentsConfigOf({ ...LIVE, installments: { enabled: true, minAmount: 500 } })).toEqual({
      enabled: true,
      minAmount: 500,
    });
    expect(installmentsConfigOf({ installments: { enabled: true, minAmount: 0 } })).toEqual({ enabled: true, minAmount: 0 });
  });
  it('older API, failed config, switch off or a malformed minimum: off', () => {
    const OFF = { enabled: false, minAmount: 0 };
    expect(installmentsConfigOf(LIVE)).toEqual(OFF);
    expect(installmentsConfigOf(SAFE_PAYMENT_CONFIG)).toEqual(OFF);
    expect(installmentsConfigOf(null)).toEqual(OFF);
    expect(installmentsConfigOf({ installments: { enabled: false, minAmount: 500 } })).toEqual(OFF);
    expect(installmentsConfigOf({ installments: { enabled: 'true' as never, minAmount: 500 } })).toEqual(OFF);
    expect(installmentsConfigOf({ installments: { enabled: true } })).toEqual(OFF);
    expect(installmentsConfigOf({ installments: { enabled: true, minAmount: '500' as never } })).toEqual(OFF);
    expect(installmentsConfigOf({ installments: { enabled: true, minAmount: -1 } })).toEqual(OFF);
  });
});
