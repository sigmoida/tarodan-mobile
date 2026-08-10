/**
 * `POST /orders/quote` yanıtının kökünde `pricingHash` + `shippingTariffVersion`
 * + `commissionRuleSetId` + `commissionRuleSetVersion` bulunur (2026-08-08 canlı
 * ölçüm — delta 18). API DTO'su bu dördünü order-create uçlarının (`checkout`,
 * `checkoutGuest`, `directBuy`, `createGuest`) hepsinde ZORUNLU bekliyor —
 * komisyon seti quote'tan aynen geri gönderilmezse DTO doğrulaması reddediyor.
 *
 * Bu test dört payload üreticisinin de `toExpectedPricing`'in ürettiği
 * `ExpectedPricingSnapshot`'ı (dört `expected*` alanı) AYNEN koşulsuz alt
 * katmana geçirdiğini doğrular.
 *
 * Mock deseni `sellerDocuments.test.ts`'ten alındı: mock fonksiyonları fabrika
 * İÇİNDE tanımlanır (named-import + babel-jest hoist etkileşimi bu ortamda
 * dış-scope `const mockX = jest.fn()` desenini kırıyor).
 */
jest.mock('../client', () => ({
  api: {
    post: jest.fn(() => Promise.resolve({ data: {} })),
    get: jest.fn(() => Promise.resolve({ data: {} })),
    patch: jest.fn(() => Promise.resolve({ data: {} })),
    delete: jest.fn(),
  },
  guestApi: {
    post: jest.fn(() => Promise.resolve({ data: {} })),
    get: jest.fn(() => Promise.resolve({ data: {} })),
  },
}));

import { api, guestApi } from '../client';
import { ordersApi, shippingApi } from '../orders';

const mockApiPost = api.post as jest.Mock;
const mockGuestPost = guestApi.post as jest.Mock;

beforeEach(() => jest.clearAllMocks());

const PRICING_HASH = '70a8bdadff29af70';
const SHIPPING_TARIFF_VERSION = 3;
const EXPECTED_PRICING = {
  expectedPricingHash: PRICING_HASH,
  expectedShippingTariffVersion: SHIPPING_TARIFF_VERSION,
  expectedCommissionRuleSetId: '11111111-2222-3333-4444-555555555555',
  expectedCommissionRuleSetVersion: 7,
};

describe('ordersApi — expectedPricingHash / expectedShippingTariffVersion', () => {
  it('checkout (üye): dört alanı da koşulsuz gönderir', async () => {
    await ordersApi.checkout({
      items: [{ productId: 'p1' }],
      idempotencyKey: 'idem-1',
      expectedPricing: EXPECTED_PRICING,
    });
    expect(mockApiPost).toHaveBeenCalledWith(
      '/orders/checkout',
      expect.objectContaining(EXPECTED_PRICING),
    );
  });

  it('checkoutGuest (misafir): dört alanı da koşulsuz gönderir', async () => {
    await ordersApi.checkoutGuest({
      items: [{ productId: 'p1' }],
      idempotencyKey: 'idem-2',
      email: 'a@b.com',
      emailVerificationCode: '123456',
      phone: '+905321234567',
      guestName: 'Ali Veli',
      shippingAddress: {
        fullName: 'Ali Veli',
        phone: '+905321234567',
        city: 'İstanbul',
        district: 'Kadıköy',
        address: 'Test Sokak No:1',
      },
      expectedPricing: EXPECTED_PRICING,
    });
    expect(mockGuestPost).toHaveBeenCalledWith(
      '/orders/checkout/guest',
      expect.objectContaining(EXPECTED_PRICING),
    );
  });

  it('directBuy (üye, Buy Now): dört alanı da koşulsuz gönderir', async () => {
    await ordersApi.directBuy({
      productId: 'p1',
      shippingAddressId: 'addr-1',
      expectedPricing: EXPECTED_PRICING,
    });
    expect(mockApiPost).toHaveBeenCalledWith(
      '/orders/buy',
      expect.objectContaining(EXPECTED_PRICING),
    );
  });

  it('createGuest (misafir tekil satın alma): dört alanı da koşulsuz gönderir', async () => {
    await ordersApi.createGuest({
      productId: 'p1',
      email: 'a@b.com',
      phone: '+905321234567',
      guestName: 'Ali Veli',
      shippingAddress: {
        fullName: 'Ali Veli',
        phone: '+905321234567',
        city: 'İstanbul',
        district: 'Kadıköy',
        address: 'Test Sokak No:1',
      },
      expectedPricing: EXPECTED_PRICING,
    });
    expect(mockGuestPost).toHaveBeenCalledWith(
      '/orders/guest',
      expect.objectContaining(EXPECTED_PRICING),
    );
  });

  it('getQuote: /orders/quote çağırır (yanıt kökünde pricingHash/shippingTariffVersion beklenir)', async () => {
    await ordersApi.getQuote({ items: [{ productId: 'p1', quantity: 1 }] });
    expect(mockApiPost).toHaveBeenCalledWith('/orders/quote', {
      items: [{ productId: 'p1', quantity: 1 }],
    });
  });
});

/**
 * Kargo ÜCRETİ sorgulayan uçlar API yüzeyinden kaldırıldı: checkout'ta gösterilen
 * kargo yalnız `POST /orders/quote` yanıtından gelir. Ayrı bir tarife çağrısı
 * ekrandaki tutarın PayTR'de çekilenden sessizce ayrışmasına yol açıyordu; yüzey
 * geri gelirse birileri onu yeniden çağırabilir. Ekran testlerindeki "hiç
 * çağrılmadı" iddiasının yerini bu alıyor.
 */
describe('shippingApi — kargo ücreti uçları yüzeyde YOK', () => {
  it.each(['getRatesByCity', 'getRates', 'calculateRates', 'getCarriers'])(
    '%s tanımlı değil',
    (name) => {
      expect((shippingApi as Record<string, unknown>)[name]).toBeUndefined();
    },
  );

  it('kargo OPERASYONU uçları (shipment oluşturma/takip) duruyor', () => {
    expect(typeof shippingApi.createShipment).toBe('function');
    expect(typeof shippingApi.updateTracking).toBe('function');
  });
});
