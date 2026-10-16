/**
 * Tek ürün görseli yükleme — dosya başına istek, uzun (120 sn) istek-özel timeout,
 * iptal sinyali ve gerçek yüzde ilerleme. Global axios timeout'una dokunulmaz.
 */
jest.mock('../client', () => ({
  api: { post: jest.fn(() => Promise.resolve({ data: [] })) },
}));

import { api } from '../client';
import { mediaApi, PRODUCT_IMAGE_UPLOAD_TIMEOUT_MS } from '../media';

const mockPost = api.post as jest.Mock;

beforeEach(() => jest.clearAllMocks());

it('tek dosyayı `images` alanıyla, 120 sn timeout ve sinyalle gönderir', async () => {
  const controller = new AbortController();
  await mediaApi.uploadProductImage(
    { uri: '/tmp/a.jpg', name: 'a.jpg', type: 'image/jpeg' },
    { signal: controller.signal },
  );
  expect(mockPost).toHaveBeenCalledTimes(1);
  const [url, body, config] = mockPost.mock.calls[0]!;
  expect(url).toBe('/media/upload/product');
  expect(body).toBeInstanceOf(FormData);
  expect(config.timeout).toBe(PRODUCT_IMAGE_UPLOAD_TIMEOUT_MS);
  expect(PRODUCT_IMAGE_UPLOAD_TIMEOUT_MS).toBe(120_000);
  expect(config.signal).toBe(controller.signal);
  expect(config.headers).toEqual({ 'Content-Type': 'multipart/form-data' });
});

it('ilerleme: yüzde bildirir; toplam bilinmiyorsa yüzde uydurmaz', async () => {
  const onProgress = jest.fn();
  await mediaApi.uploadProductImage({ uri: '/tmp/a.jpg', name: 'a.jpg', type: 'image/jpeg' }, { onProgress });
  const { onUploadProgress } = mockPost.mock.calls[0]![2];
  onUploadProgress({ loaded: 25, total: 100 });
  onUploadProgress({ loaded: 10 });
  expect(onProgress).toHaveBeenCalledTimes(1);
  expect(onProgress).toHaveBeenCalledWith(25);
});
