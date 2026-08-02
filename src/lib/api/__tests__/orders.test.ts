/**
 * `POST /orders/quote` yanıtının kökünde `pricingHash` + `shippingTariffVersion`
 * bulunur (2026-07-30 canlı ölçüm). API DTO'su bu ikisini order-create uçlarının
 * (`checkout`, `checkoutGuest`, `directBuy`, `createGuest`) hepsinde ZORUNLU
 * bekliyor — 2026-07-30'dan beri mobil ikisini de göndermediği için dört satın
 * alma yolunun dördü de 400 alıyordu.
 *
 * Bu test dört payload üreticisinin de `expectedPricingHash` +
 * `expectedShippingTariffVersion`'ı AYNEN (koşulsuz — web'in `expectedPricingHash`'i
 * yalnızca doluysa gönderme hatasının aksine) alt katmana geçirdiğini doğrular.
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
import { ordersApi } from '../orders';

const mockApiPost = api.post as jest.Mock;
const mockGuestPost = guestApi.post as jest.Mock;

beforeEach(() => jest.clearAllMocks());

const PRICING_HASH = '70a8bdadff29af70';
const SHIPPING_TARIFF_VERSION = 3;

describe('ordersApi — expectedPricingHash / expectedShippingTariffVersion', () => {
  it('checkout (üye): ikisini de koşulsuz gönderir', async () => {
    await ordersApi.checkout({
      items: [{ productId: 'p1' }],
      idempotencyKey: 'idem-1',
      expectedPricingHash: PRICING_HASH,
      expectedShippingTariffVersion: SHIPPING_TARIFF_VERSION,
    });
    expect(mockApiPost).toHaveBeenCalledWith(
      '/orders/checkout',
      expect.objectContaining({
        expectedPricingHash: PRICING_HASH,
        expectedShippingTariffVersion: SHIPPING_TARIFF_VERSION,
      }),
    );
  });

  it('checkoutGuest (misafir): ikisini de koşulsuz gönderir', async () => {
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
      expectedPricingHash: PRICING_HASH,
      expectedShippingTariffVersion: SHIPPING_TARIFF_VERSION,
    });
    expect(mockGuestPost).toHaveBeenCalledWith(
      '/orders/checkout/guest',
      expect.objectContaining({
        expectedPricingHash: PRICING_HASH,
        expectedShippingTariffVersion: SHIPPING_TARIFF_VERSION,
      }),
    );
  });

  it('directBuy (üye, Buy Now): ikisini de koşulsuz gönderir', async () => {
    await ordersApi.directBuy({
      productId: 'p1',
      shippingAddressId: 'addr-1',
      expectedPricingHash: PRICING_HASH,
      expectedShippingTariffVersion: SHIPPING_TARIFF_VERSION,
    });
    expect(mockApiPost).toHaveBeenCalledWith(
      '/orders/buy',
      expect.objectContaining({
        expectedPricingHash: PRICING_HASH,
        expectedShippingTariffVersion: SHIPPING_TARIFF_VERSION,
      }),
    );
  });

  it('createGuest (misafir tekil satın alma): ikisini de koşulsuz gönderir', async () => {
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
      expectedPricingHash: PRICING_HASH,
      expectedShippingTariffVersion: SHIPPING_TARIFF_VERSION,
    });
    expect(mockGuestPost).toHaveBeenCalledWith(
      '/orders/guest',
      expect.objectContaining({
        expectedPricingHash: PRICING_HASH,
        expectedShippingTariffVersion: SHIPPING_TARIFF_VERSION,
      }),
    );
  });

  it('getQuote: /orders/quote çağırır (yanıt kökünde pricingHash/shippingTariffVersion beklenir)', async () => {
    await ordersApi.getQuote({ items: [{ productId: 'p1', quantity: 1 }] });
    expect(mockApiPost).toHaveBeenCalledWith('/orders/quote', {
      items: [{ productId: 'p1', quantity: 1 }],
    });
  });
});
