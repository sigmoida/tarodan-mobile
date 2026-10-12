/**
 * B-1.3 · Varsayılan adres sözleşmesi. API'de `PATCH /users/me/addresses/:id/default`
 * YOK; doğru uç `PATCH /users/me/addresses/:id` gövdesi `{ isDefault: true }`
 * (apps/api user.controller.ts `updateAddress`; web `lib/api/user.ts` setDefault).
 * Mock deseni `orders.test.ts` ile aynı.
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

import { api } from '../client';
import { addressesApi } from '../checkout';

describe('B-1.3 · addressesApi.setDefault', () => {
  it('PATCH /users/me/addresses/:id gövdesi { isDefault: true } gönderir', async () => {
    await addressesApi.setDefault('a1');
    expect(api.patch).toHaveBeenCalledTimes(1);
    expect(api.patch).toHaveBeenCalledWith('/users/me/addresses/a1', { isDefault: true });
  });
});
