/**
 * Parite C-3.2 · ilan yaşam döngüsü uçları: yenileme (tek/toplu) ve kaldırma nedeni
 * (DELETE gövdesi / PATCH alanları). Sözleşme: apps/api `product.controller.ts`.
 */
jest.mock('../client', () => ({
  api: {
    get: jest.fn(() => Promise.resolve({ data: {} })),
    post: jest.fn(() => Promise.resolve({ data: {} })),
    patch: jest.fn(() => Promise.resolve({ data: {} })),
    delete: jest.fn(() => Promise.resolve({ data: {} })),
  },
}));

import { api } from '../client';
import { productsApi } from '../products';

beforeEach(() => jest.clearAllMocks());

describe('productsApi — yenileme', () => {
  it('tek ilan: POST /products/:id/renew (PATCH relist değil)', async () => {
    await productsApi.renew('p1');
    expect(api.post).toHaveBeenCalledWith('/products/p1/renew');
    expect(api.patch).not.toHaveBeenCalled();
  });

  it('toplu: POST /products/my/renew { ids }', async () => {
    await productsApi.renewMany(['a', 'b']);
    expect(api.post).toHaveBeenCalledWith('/products/my/renew', { ids: ['a', 'b'] });
  });
});

describe('productsApi — kaldırma nedeni', () => {
  it('silme: neden DELETE isteğinin GÖVDESİNDE gider', async () => {
    const removal = { removalReason: 'sold_elsewhere', removalPlatform: 'dolap', removalDetail: 'elden' };
    await productsApi.delete('p1', removal);
    expect(api.delete).toHaveBeenCalledWith('/products/p1', { data: removal });
  });

  it('silme: neden yoksa eski çağrı biçimi (gövdesiz) korunur', async () => {
    await productsApi.delete('p1');
    expect(api.delete).toHaveBeenCalledWith('/products/p1', undefined);
  });

  it('pasife alma: PATCH { status: inactive, ...neden }', async () => {
    await productsApi.deactivate('p1', { removalReason: 'paused_temporarily', removalDetail: 'Tatil' });
    expect(api.patch).toHaveBeenCalledWith('/products/p1', {
      status: 'inactive',
      removalReason: 'paused_temporarily',
      removalDetail: 'Tatil',
    });
  });
});
