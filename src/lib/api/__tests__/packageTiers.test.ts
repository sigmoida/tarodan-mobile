/**
 * Kargo paket kademesi — `GET /shipping/package-tiers`.
 *
 * Sözleşme canlı ölçüldü (staging, 2026-08-02):
 *   { tariffVersion: 3, tiers: [{ code, label, amount, billableDesi,
 *     minDesi, maxDesi, sampleWidth, sampleHeight, sampleLength }] }
 * Üç kademede de `sample*` alanları bugün `null` — kod bunu tolere etmeli.
 *
 * ⚠️ Doküman 14 §1 BAĞLAYICI: mobil arayüzde desi HİÇ görünmez. `billableDesi`,
 * `minDesi`, `maxDesi` yalnız sunucunun paket kademesini türetmesi için var;
 * ekranda asla render edilmez.
 */
jest.mock('../client', () => ({
  api: {
    get: jest.fn(() => Promise.resolve({ data: {} })),
    post: jest.fn(() => Promise.resolve({ data: {} })),
    patch: jest.fn(),
    delete: jest.fn(),
  },
  guestApi: { get: jest.fn(), post: jest.fn() },
}));

import { api } from '../client';
import { ordersApi, shippingApi } from '../orders';

const mockGet = api.get as jest.Mock;

beforeEach(() => jest.clearAllMocks());

describe('shippingApi.getPackageTiers', () => {
  it('calls the public tariff endpoint', async () => {
    await shippingApi.getPackageTiers();
    expect(mockGet).toHaveBeenCalledWith('/shipping/package-tiers');
  });
});

describe('ordersApi.getCommissionPreview', () => {
  it('passes the package tier so the seller sees the right net earning', async () => {
    await ordersApi.getCommissionPreview({
      amount: 500,
      categoryId: 'c1',
      packageTier: 'large',
    });

    expect(mockGet).toHaveBeenCalledWith('/orders/commission-preview', {
      params: { amount: 500, categoryId: 'c1', packageTier: 'large' },
    });
  });

  it('omits the tier when the caller has none rather than guessing small', async () => {
    await ordersApi.getCommissionPreview({ amount: 500 });

    expect(mockGet).toHaveBeenCalledWith('/orders/commission-preview', {
      params: { amount: 500 },
    });
  });
});
