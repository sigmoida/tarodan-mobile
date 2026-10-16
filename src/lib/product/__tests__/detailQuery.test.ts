/**
 * Ürün detayı sorgusu: yalnız gerçek "yok" (404 / geçersiz id 400) → null; ağ / 5xx FIRLATIR;
 * sahibe-özel uca düşüş; görüntülenme sorguda / prefetch'te SAYILMAZ.
 */
import { QueryClient } from '@tanstack/react-query';

jest.mock('@/lib/api', () => ({
  productsApi: { getOne: jest.fn(), getMyById: jest.fn(), incrementView: jest.fn() },
}));
let mockIsAuthenticated = false;
jest.mock('@/stores/authStore', () => ({
  useAuthStore: { getState: () => ({ isAuthenticated: mockIsAuthenticated }) },
}));

import { productsApi } from '@/lib/api';
import { qk } from '@/lib/query';
import {
  fetchProductDetail,
  isProductNotFoundError,
  prefetchProductDetail,
  productDetailQuery,
} from '../detailQuery';

const getOne = productsApi.getOne as jest.Mock;
const getMyById = productsApi.getMyById as jest.Mock;
const incrementView = productsApi.incrementView as jest.Mock;
const httpError = (status: number) => ({ response: { status } });

describe('fetchProductDetail', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsAuthenticated = false;
  });

  it('ürünü sarmalından açar; görüntülenme saymaz', async () => {
    getOne.mockResolvedValue({ data: { data: { id: 'p1', title: 'A' } } });
    await expect(fetchProductDetail('p1', false)).resolves.toEqual({ id: 'p1', title: 'A' });
    expect(incrementView).not.toHaveBeenCalled();
  });

  it('404 ve geçersiz id (400) → null', async () => {
    getOne.mockRejectedValueOnce(httpError(404));
    await expect(fetchProductDetail('p1', false)).resolves.toBeNull();
    getOne.mockRejectedValueOnce(httpError(400));
    await expect(fetchProductDetail('p1', false)).resolves.toBeNull();
  });

  it('ağ hatası ve 5xx fırlatır (bulunamadı önbelleğine dönüşmez); sahibe-özel uç denenmez', async () => {
    const network = new Error('Network Error');
    getOne.mockRejectedValueOnce(network);
    await expect(fetchProductDetail('p1', true)).rejects.toBe(network);
    getOne.mockRejectedValueOnce(httpError(502));
    await expect(fetchProductDetail('p1', true)).rejects.toEqual(httpError(502));
    expect(getMyById).not.toHaveBeenCalled();
  });

  it('girişliyken public 404 → sahibe-özel uç; sahibi değilse (404/403) null, uç düşerse hata', async () => {
    getOne.mockRejectedValue(httpError(404));
    getMyById.mockResolvedValueOnce({ data: { data: { id: 'p1', title: 'Benim', status: 'pending' } } });
    await expect(fetchProductDetail('p1', true)).resolves.toMatchObject({ title: 'Benim' });

    getMyById.mockRejectedValueOnce(httpError(403));
    await expect(fetchProductDetail('p1', true)).resolves.toBeNull();

    getMyById.mockRejectedValueOnce(httpError(500));
    await expect(fetchProductDetail('p1', true)).rejects.toEqual(httpError(500));
  });

  it('misafirde public 404 sahibe-özel uca gitmez', async () => {
    getOne.mockRejectedValue(httpError(404));
    await expect(fetchProductDetail('p1', false)).resolves.toBeNull();
    expect(getMyById).not.toHaveBeenCalled();
  });
});

describe('productDetailQuery / prefetchProductDetail', () => {
  beforeEach(() => jest.clearAllMocks());

  it('tek anahtar: qk.products.detail; 4xx yeniden denenmez, ağ hatası bir kez', () => {
    const opts = productDetailQuery('p1', false);
    expect(opts.queryKey).toEqual(qk.products.detail('p1'));
    const retry = opts.retry as (n: number, e: unknown) => boolean;
    expect(retry(0, new Error('net'))).toBe(true);
    expect(retry(1, new Error('net'))).toBe(false);
    expect(retry(0, httpError(403))).toBe(false);
    expect(isProductNotFoundError(httpError(500))).toBe(false);
  });

  it('prefetch detay önbelleğini aynı anahtarla doldurur, görüntülenme saymaz; taze veride istek atmaz', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 60_000 } } });
    getOne.mockResolvedValue({ data: { id: 'p1', title: 'A' } });
    prefetchProductDetail(qc, 'p1');
    await new Promise((r) => setImmediate(r));
    expect(qc.getQueryData(qk.products.detail('p1'))).toEqual({ id: 'p1', title: 'A' });
    expect(incrementView).not.toHaveBeenCalled();

    prefetchProductDetail(qc, 'p1');
    await new Promise((r) => setImmediate(r));
    expect(getOne).toHaveBeenCalledTimes(1);
  });

  it('prefetch giriş durumunu store\'dan okur (sahibe-özel düşüş)', async () => {
    mockIsAuthenticated = true;
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    getOne.mockRejectedValue(httpError(404));
    getMyById.mockResolvedValue({ data: { id: 'p1', title: 'Benim' } });
    prefetchProductDetail(qc, 'p1');
    await new Promise((r) => setImmediate(r));
    await new Promise((r) => setImmediate(r));
    expect(getMyById).toHaveBeenCalledWith('p1');
  });
});
