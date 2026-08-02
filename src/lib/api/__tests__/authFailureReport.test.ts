/**
 * Refresh başarısız → sessiz logout dalı, bugün hiçbir iz bırakmadan
 * kullanıcıyı login'e atıyor. Denetim (2026-08-03 §5.3) bu dalı ayırt etmek
 * için gereken gövdelerin (`EMAIL_NOT_VERIFIED`, IP-blok 403) canlı
 * üretilemediğini, o yüzden **kör bağlama yapılmaması** gerektiğini yazdı;
 * risksiz hazırlık ise ayrıştırıcı + `x-request-id` raporu.
 *
 * Bu suite o raporu kilitler: gerçek gövde bir kez Sentry'de görüldüğünde
 * ayrım tek satırda takılabilecek.
 */
jest.mock('expo-router', () => ({
  router: { replace: jest.fn(), push: jest.fn(), back: jest.fn() },
}));

jest.mock('@/lib/api-client', () => {
  const actual = jest.requireActual('@/lib/api-client');
  const responseErrorHandlers: any[] = [];
  const makeClient = () => {
    const client: any = jest.fn(() => Promise.resolve({ data: {} }));
    client.interceptors = {
      request: { use: jest.fn() },
      response: {
        use: jest.fn((_onOk: any, onErr: any) => {
          if (onErr) responseErrorHandlers.push(onErr);
        }),
      },
    };
    return client;
  };
  return {
    axios: { post: jest.fn() },
    createApiClient: jest.fn(() => makeClient()),
    singleFlight: actual.singleFlight,
    __responseErrorHandlers: responseErrorHandlers,
  };
});

jest.mock('@/stores/authStore', () => {
  const { create } = require('zustand');
  return { useAuthStore: create(() => ({ token: null, logout: jest.fn() })) };
});

const mockCaptureException = jest.fn();
jest.mock('@/services/sentry', () => ({
  captureException: (...args: unknown[]) => mockCaptureException(...args),
}));

import * as SecureStore from 'expo-secure-store';
import '../client';

const onResponseError = (jest.requireMock('@/lib/api-client') as any)
  .__responseErrorHandlers[0] as (error: any) => Promise<any>;

const mockGetItem = SecureStore.getItemAsync as unknown as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockGetItem.mockImplementation(async () => null); // refresh token yok → dal tetiklenir
});

describe('silent logout reporting', () => {
  it('reports the request id and the server discriminators to Sentry', async () => {
    await onResponseError({
      config: { headers: {}, method: 'get', url: '/orders' },
      response: {
        status: 401,
        headers: { 'x-request-id': 'req-9' },
        data: { i18nKey: 'server.auth.invalidRefreshToken' },
      },
    }).catch(() => undefined);

    expect(mockCaptureException).toHaveBeenCalledTimes(1);
    const options = mockCaptureException.mock.calls[0]![1] as any;
    expect(options.tags.requestId).toBe('req-9');
    expect(options.extra.i18nKey).toBe('server.auth.invalidRefreshToken');
    expect(options.extra.status).toBe(401);
  });

  it('still reports when the server sends no request id', async () => {
    await onResponseError({
      config: { headers: {}, method: 'get', url: '/orders' },
      response: { status: 401, headers: {}, data: {} },
    }).catch(() => undefined);

    expect(mockCaptureException).toHaveBeenCalledTimes(1);
  });

  it('does not report when the refresh succeeds', async () => {
    mockGetItem.mockImplementation(async (key: string) =>
      key === 'refreshToken' ? 'refresh-1' : 'expired',
    );
    const { axios } = jest.requireMock('@/lib/api-client');
    (axios.post as jest.Mock).mockResolvedValueOnce({ data: { accessToken: 'fresh' } });

    await onResponseError({
      config: { headers: {}, method: 'get', url: '/orders' },
      response: { status: 401, headers: { 'x-request-id': 'req-ok' }, data: {} },
    });

    expect(mockCaptureException).not.toHaveBeenCalled();
  });
});
