/**
 * H1/H2 — refresh'in GEÇİCİ hatası (ağ, zaman aşımı, 5xx, 429) oturumu kapatmaz.
 *
 * Eskiden yenilemenin her hatası `handleAuthFailure` → zorunlu çıkış + login'e
 * yönlendirmeydi; refresh isteğinin süre sınırı da yoktu (axios varsayılanı 0), asılı
 * bir refresh tek-uçuş üzerinden HER kimlikli isteği sonsuza dek bekletiyordu.
 *
 * Sözleşme:
 * - yalnız 400/401/403 ya da bilinen refresh anahtarı → zorunlu çıkış,
 * - geçici hata → çıkış YOK, token'lar silinmez, istek ağ/5xx görünümlü hatayla reddedilir
 *   (asıl 401 değil; refresh token'ı taşıyan refresh isteğinin config'i de değil),
 * - refresh `REFRESH_TIMEOUT_MS`'de kesilir (zaman aşımı geçicidir),
 * - tek-uçuş başarısızlıktan sonra serbest kalır (sonraki 401 yeniden dener),
 * - eski oturumun refresh sonucu (yanıt beklenirken çıkış + giriş) yeni oturumu kapatmaz.
 */
jest.mock('expo-router', () => ({
  router: { replace: jest.fn(), push: jest.fn(), back: jest.fn() },
}));

type ErrorHandler = (error: unknown) => Promise<unknown>;

jest.mock('@/lib/api-client', () => {
  const actual = jest.requireActual('@/lib/api-client');
  const responseErrorHandlers: ErrorHandler[] = [];
  const makeClient = () => {
    const client = Object.assign(
      jest.fn(() => Promise.resolve({ data: { retried: true } })),
      {
        interceptors: {
          request: { use: jest.fn() },
          response: {
            use: jest.fn((_onOk: unknown, onErr?: ErrorHandler) => {
              if (onErr) responseErrorHandlers.push(onErr);
            }),
          },
        },
      },
    );
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
  const { create } = jest.requireActual('zustand');
  return { useAuthStore: create(() => ({ isAuthenticated: true, token: null, logout: jest.fn() })) };
});

jest.mock('@/services/sentry', () => ({ captureException: jest.fn(), addBreadcrumb: jest.fn(), setUser: jest.fn() }));

import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';
import { axios } from '@/lib/api-client';
import { useAuthStore } from '@/stores/authStore';
import { REFRESH_TIMEOUT_MS, advanceSessionEpoch } from '../client';

type Rejection = {
  code?: string;
  config: { url?: string };
  response?: { status: number; config: { url?: string } };
};

const handler = (jest.requireMock('@/lib/api-client') as { __responseErrorHandlers: ErrorHandler[] })
  .__responseErrorHandlers[0];
const onResponseError = (error: unknown) => handler(error);
/** Reddedilen hatayı döndürür (çözülürse test başarısız). */
const rejectionOf = (error: unknown) =>
  handler(error).then(
    () => {
      throw new Error('expected rejection');
    },
    (e) => e as Rejection,
  );

const mockPost = axios.post as unknown as jest.Mock;
const mockGetItem = SecureStore.getItemAsync as unknown as jest.Mock;
const mockDeleteItem = SecureStore.deleteItemAsync as unknown as jest.Mock;

const error401 = () => ({
  isAxiosError: true,
  code: 'ERR_BAD_REQUEST',
  message: 'Request failed with status code 401',
  config: { url: '/users/me', headers: {} as Record<string, string> },
  response: { status: 401, headers: {}, data: {} },
});

const networkError = () =>
  Object.assign(new Error('Network Error'), {
    isAxiosError: true,
    code: 'ERR_NETWORK',
    config: { url: '/auth/refresh', data: '{"refreshToken":"secret-refresh"}' },
  });

const httpError = (status: number, data: Record<string, unknown> = {}) =>
  Object.assign(new Error(`Request failed with status code ${status}`), {
    isAxiosError: true,
    code: status >= 500 ? 'ERR_BAD_RESPONSE' : 'ERR_BAD_REQUEST',
    config: { url: '/auth/refresh', data: '{"refreshToken":"secret-refresh"}' },
    response: { status, data, headers: {}, config: { data: '{"refreshToken":"secret-refresh"}' } },
  });

let logout: jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  logout = jest.fn(() => Promise.resolve());
  useAuthStore.setState({ token: 'a-token', logout });
  mockGetItem.mockImplementation(async (key: string) => (key === 'refreshToken' ? 'a-refresh' : 'a-token'));
});

afterEach(() => {
  jest.useRealTimers();
});

describe('geçici refresh hatası oturumu korur (H1)', () => {
  it('ağ hatası: çıkış/yönlendirme yok, token silinmez, istek ağ hatasıyla reddedilir', async () => {
    mockPost.mockRejectedValueOnce(networkError());

    const rejection = await rejectionOf(error401());

    expect(logout).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
    expect(mockDeleteItem).not.toHaveBeenCalled();
    // Çağıran bunu "oturum bitti" (401) sanmamalı: yanıtsız ağ hatası görünümü.
    expect(rejection.response).toBeUndefined();
    expect(rejection.code).toBe('ERR_NETWORK');
    // Asıl isteğin config'i — refresh token'ı taşıyan refresh isteğininki DEĞİL.
    expect(rejection.config.url).toBe('/users/me');
    expect(JSON.stringify(rejection.config)).not.toContain('secret-refresh');
    expect(useAuthStore.getState().token).toBe('a-token');
  });

  it.each([429, 500, 502, 503])('%i: çıkış yok, istek o durumla reddedilir', async (status) => {
    mockPost.mockRejectedValueOnce(httpError(status));

    const rejection = await rejectionOf(error401());

    expect(logout).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
    expect(rejection.response?.status).toBe(status);
    expect(rejection.response?.config.url).toBe('/users/me');
    expect(JSON.stringify(rejection.response)).not.toContain('secret-refresh');
  });

  it('anahtar zinciri okunamazsa (refresh token okuma hatası) çıkış yok', async () => {
    mockGetItem.mockImplementation(async (key: string) => {
      if (key === 'refreshToken') throw new Error('keychain locked');
      return 'a-token';
    });

    await onResponseError(error401()).catch(() => undefined);

    expect(mockPost).not.toHaveBeenCalled();
    expect(logout).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it.each([400, 401, 403])('%i (kesin red): zorunlu çıkış + login', async (status) => {
    mockPost.mockRejectedValueOnce(httpError(status));

    const rejection = await rejectionOf(error401());

    expect(logout).toHaveBeenCalledWith({ reason: 'forced' });
    expect(router.replace).toHaveBeenCalledWith('/(auth)/login');
    // Çıkış yolunda asıl 401 çağırana verilir (mevcut davranış).
    expect(rejection.response?.status).toBe(401);
  });

  it('bilinen refresh anahtarı (5xx gövdesinde bile) kesin red sayılır', async () => {
    mockPost.mockRejectedValueOnce(httpError(500, { i18nKey: 'server.auth.refreshTokenRevoked' }));

    await onResponseError(error401()).catch(() => undefined);

    expect(logout).toHaveBeenCalledWith({ reason: 'forced' });
  });

  it('tek-uçuş başarısızlıktan sonra serbest: sonraki 401 yeniden refresh dener', async () => {
    mockPost.mockRejectedValueOnce(networkError());
    await onResponseError(error401()).catch(() => undefined);

    mockPost.mockResolvedValueOnce({ data: { accessToken: 'fresh' } });
    const retried = await onResponseError(error401());

    expect(mockPost).toHaveBeenCalledTimes(2);
    expect(retried).toEqual({ data: { retried: true } });
  });

  it('eşzamanlı 401’ler tek refresh paylaşır; geçici hatada hiçbiri çıkış yapmaz', async () => {
    mockPost.mockRejectedValueOnce(networkError());

    await Promise.all([
      onResponseError(error401()).catch(() => undefined),
      onResponseError(error401()).catch(() => undefined),
    ]);

    expect(mockPost).toHaveBeenCalledTimes(1);
    expect(logout).not.toHaveBeenCalled();
  });
});

describe('refresh süre sınırı (H2)', () => {
  it('refresh isteği süre sınırı ve iptal sinyaliyle gider', async () => {
    mockPost.mockResolvedValueOnce({ data: { accessToken: 'fresh' } });

    await onResponseError(error401());

    const options = mockPost.mock.calls[0][2];
    expect(options.timeout).toBe(REFRESH_TIMEOUT_MS);
    expect(options.signal).toBeDefined();
    expect(options.withCredentials).toBe(false);
  });

  it('asılı refresh süre dolunca kesilir: geçici sayılır, çıkış yok, tek-uçuş serbest', async () => {
    jest.useFakeTimers();
    // `timeout` tetiklenmeyen asılı soket: yalnız AbortSignal sonlandırır.
    mockPost.mockImplementationOnce(
      (_url: string, _body: unknown, options: { signal: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          options.signal.addEventListener('abort', () =>
            reject(Object.assign(new Error('canceled'), { isAxiosError: true, code: 'ERR_CANCELED' })),
          );
        }),
    );

    const pending = rejectionOf(error401());
    await jest.advanceTimersByTimeAsync(REFRESH_TIMEOUT_MS);
    const rejection = await pending;

    expect(logout).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
    expect(rejection.response).toBeUndefined();
    // Kullanıcı iptali (ERR_CANCELED) değil, zaman aşımı olarak görünür.
    expect(rejection.code).toBe('ECONNABORTED');

    mockPost.mockResolvedValueOnce({ data: { accessToken: 'fresh' } });
    await expect(onResponseError(error401())).resolves.toEqual({ data: { retried: true } });
  });
});

describe('oturum değişimi (stale refresh)', () => {
  it('refresh beklenirken çıkış + yeni giriş: kesin red yeni oturumu KAPATMAZ', async () => {
    let rejectRefresh: (e: unknown) => void = jest.fn();
    mockPost.mockReturnValueOnce(
      new Promise((_resolve, reject) => {
        rejectRefresh = reject;
      }),
    );

    const pending = onResponseError(error401()).catch(() => undefined);
    await Promise.resolve();
    // A çıktı, B giriş yaptı (login de kuşağı ilerletir).
    advanceSessionEpoch();
    rejectRefresh(httpError(401));
    await pending;

    expect(logout).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
  });
});
