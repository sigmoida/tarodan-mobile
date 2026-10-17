/**
 * API delta 20: kart saklama ödeme AMACINA göre (`purposes.<amaç>.cardStorageEnabled`).
 *
 * Eski yardımcı `recurringEnabled`'a bakıyordu: pazaryeri mağazasında recurring
 * hep kapalı olduğu için sepet ödemesinde kayıtlı kart HİÇ görünmüyordu. Daha
 * eski bir sürüm de genel `recurringEnabled`'ı okuyup ürün ödemesinde
 * "oto-yenileme için kaydet" diyordu (canlı yapılandırma 2026-09-29).
 */
import { paymentCapabilities, SAFE_PAYMENT_CONFIG } from '../capabilities';

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
