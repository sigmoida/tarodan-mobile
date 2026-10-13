/**
 * API delta 20 — kart listesi amaçla istenir; `/payments/config` amaç başına.
 * (Mock deseni `orders.test.ts` ile aynı: fonksiyonlar fabrika içinde.)
 */
jest.mock('../client', () => ({
  api: {
    post: jest.fn(() => Promise.resolve({ data: {} })),
    get: jest.fn(() => Promise.resolve({ data: [] })),
    patch: jest.fn(() => Promise.resolve({ data: {} })),
    delete: jest.fn(),
  },
  guestApi: {
    post: jest.fn(() => Promise.resolve({ data: {} })),
    get: jest.fn(() => Promise.resolve({ data: {} })),
  },
}));

import { api } from '../client';
import { membershipApi } from '../membership';
import { paymentsApi } from '../checkout';

const mockGet = api.get as jest.Mock;

beforeEach(() => jest.clearAllMocks());

describe('membershipApi.listCards', () => {
  it('ödeme ekranı: `?purpose=checkout`', async () => {
    await membershipApi.listCards('checkout');
    expect(mockGet).toHaveBeenCalledWith('/membership/cards', { params: { purpose: 'checkout' } });
  });

  it('üyelik ödemesi: `?purpose=membership`', async () => {
    await membershipApi.listCards('membership');
    expect(mockGet).toHaveBeenCalledWith('/membership/cards', { params: { purpose: 'membership' } });
  });

  it('kart yönetimi (amaçsız): tüm kartlar — sorgu parametresi YOK', async () => {
    await membershipApi.listCards();
    expect(mockGet).toHaveBeenCalledWith('/membership/cards', undefined);
  });
});

it('paymentsApi.getConfig: GET /payments/config', async () => {
  await paymentsApi.getConfig();
  expect(mockGet).toHaveBeenCalledWith('/payments/config');
});
