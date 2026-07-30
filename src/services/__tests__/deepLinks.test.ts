/**
 * Derin bağlantı yönlendirmesi: soğuk başlatma (getInitialURL) ve uygulama açıkken
 * (url olayı) gelen bağlantıyı toMobileRoute ile mobil rotaya çevirip yönlendirir.
 * Eşlenmeyen yol sessizce yok sayılır (ör. ödeme dönüş URL'leri).
 */
const mockPush = jest.fn();
jest.mock('expo-router', () => ({ router: { push: (r: string) => mockPush(r) } }));

let urlListener: ((e: { url: string }) => void) | null = null;
const mockGetInitialURL = jest.fn();
jest.mock('expo-linking', () => ({
  getInitialURL: () => mockGetInitialURL(),
  addEventListener: (_evt: string, cb: (e: { url: string }) => void) => {
    urlListener = cb;
    return { remove: jest.fn() };
  },
}));

import { pathFromUrl, setupDeepLinkRouting } from '../deepLinks';

beforeEach(() => {
  jest.clearAllMocks();
  urlListener = null;
  mockGetInitialURL.mockResolvedValue(null);
});

describe('pathFromUrl', () => {
  it('https universal link\'ten yol + sorguyu çıkarır', () => {
    expect(pathFromUrl('https://tarodan.com.tr/verify-email?token=abc')).toBe(
      '/verify-email?token=abc',
    );
  });

  it('custom scheme bağlantısından yol çıkarır', () => {
    expect(pathFromUrl('tarodan://product/p-1')).toBe('/product/p-1');
  });

  it('yol yoksa null döner', () => {
    expect(pathFromUrl('https://tarodan.com.tr')).toBeNull();
    expect(pathFromUrl('')).toBeNull();
  });
});

describe('setupDeepLinkRouting', () => {
  it('soğuk başlatmada gelen bağlantıyı yönlendirir', async () => {
    mockGetInitialURL.mockResolvedValue('https://tarodan.com.tr/product/p-1');
    setupDeepLinkRouting();
    await new Promise((r) => setImmediate(r));
    expect(mockPush).toHaveBeenCalledWith('/product/p-1');
  });

  it('uygulama açıkken gelen bağlantıyı yönlendirir', async () => {
    setupDeepLinkRouting();
    await new Promise((r) => setImmediate(r));
    urlListener!({ url: 'https://tarodan.com.tr/orders/ord-1' });
    expect(mockPush).toHaveBeenCalledWith('/orders/ord-1');
  });

  it('ödeme dönüş URL\'ini yönlendirmez', async () => {
    setupDeepLinkRouting();
    await new Promise((r) => setImmediate(r));
    urlListener!({ url: 'https://tarodan.com.tr/payment/success?paymentId=p1' });
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('temizleyici döner', async () => {
    const cleanup = setupDeepLinkRouting();
    expect(typeof cleanup).toBe('function');
    cleanup();
  });
});
