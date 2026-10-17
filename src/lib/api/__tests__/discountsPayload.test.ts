/**
 * `discountsApi.create/update` gövde tipi: adet koşullu türler (`bogo`, `bulk_quantity`) ve
 * `buyQuantity`/`getQuantity`/`minQuantity` alanları tipli (çağıranda `as any` yok).
 * `@ts-expect-error` satırları tsc'de çalışır: tür dışı değer derlenmemeli.
 */
jest.mock('../client', () => ({
  api: {
    post: jest.fn(() => Promise.resolve({ data: {} })),
    get: jest.fn(),
    patch: jest.fn(() => Promise.resolve({ data: {} })),
    delete: jest.fn(),
  },
  guestApi: { post: jest.fn(), get: jest.fn() },
}));

import { api } from '../client';
import { discountsApi, type CreateDiscountPayload, type UpdateDiscountPayload } from '../membership';

const base: CreateDiscountPayload = {
  name: '2 Al 1 Öde',
  type: 'bogo',
  value: 0,
  scope: 'seller',
  buyQuantity: 2,
  getQuantity: 1,
  startDate: '2026-01-01T00:00:00.000Z',
  endDate: '2026-02-01T00:00:00.000Z',
};

describe('discountsApi gövde tipleri', () => {
  it('bogo: POST /discounts gövdesi buy/get alanlarını taşır', async () => {
    await discountsApi.create(base);
    expect(api.post).toHaveBeenCalledWith('/discounts', expect.objectContaining({ type: 'bogo', buyQuantity: 2, getQuantity: 1 }));
  });

  it('bulk_quantity: minQuantity ile derlenir ve gider', async () => {
    const bulk: CreateDiscountPayload = { ...base, type: 'bulk_quantity', value: 15, buyQuantity: undefined, getQuantity: undefined, minQuantity: 3 };
    await discountsApi.create(bulk);
    expect(api.post).toHaveBeenLastCalledWith('/discounts', expect.objectContaining({ type: 'bulk_quantity', minQuantity: 3, value: 15 }));
  });

  it('PATCH: temizlenen alan null gidebilir (bogo -> yüzde)', async () => {
    const patch: UpdateDiscountPayload = { type: 'percentage', value: 10, buyQuantity: null, getQuantity: null };
    await discountsApi.update('d1', patch);
    expect(api.patch).toHaveBeenCalledWith('/discounts/d1', patch);
  });

  it('tür dışı değerler derlenmez', () => {
    // @ts-expect-error bilinmeyen indirim türü
    const badType: CreateDiscountPayload = { ...base, type: 'buy_one' };
    // @ts-expect-error adet alanı sayı olmalı
    const badQty: CreateDiscountPayload = { ...base, buyQuantity: '2' };
    // @ts-expect-error oluşturmada null yok (temizleme yalnız PATCH'te)
    const badNull: CreateDiscountPayload = { ...base, buyQuantity: null };
    expect([badType, badQty, badNull]).toHaveLength(3);
  });
});
