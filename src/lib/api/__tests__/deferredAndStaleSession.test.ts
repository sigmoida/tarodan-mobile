/**
 * Ertelenmiş (doğrulanmamış) oturum + bayat oturum hatası (`SESSION_STALE`).
 *
 * A — Açılışta oturum geçici hatayla doğrulanamadı: token'lar saklı, arayüz misafir. Eskiden
 * interceptor saklı token'ı yine ekliyordu (misafir görünen sepet/favori isteği gerçek hesaba
 * gidiyordu) ve refresh kesin reddedilince `handleAuthFailure` oturumu hiç açık görmemiş
 * kullanıcıyı login'e / verify-email'e atıyordu. Sözleşme:
 * - ertelenmişken istekler Bearer TAŞIMAZ (yalnız `SESSION_PROBE` taşır),
 * - misafir olarak giden isteğin 401'i refresh / çıkış / yönlendirme tetiklemez,
 * - probe'un refresh'i kesin reddedilirse oturum SESSİZCE atılır (`discardStoredSession`),
 *   zorunlu çıkış ve yönlendirme yok.
 *
 * B — Refresh beklenirken oturum değişti (`stale`, ya da `invalid` ama kuşak ilerledi) ya da
 * istek kapanmış oturumda başladı: çağırana asıl 401 DEĞİL, yanıtsız `SESSION_STALE` verilir —
 * 401'e göre dallanan çağıranlar YENİ oturumun token'larını silmesin. `handleAuthFailure`'ın
 * yedek temizliği de kuşağı ilerletir.
 */
jest.mock('expo-router', () => ({
  router: { replace: jest.fn(), push: jest.fn(), back: jest.fn() },
}));

type Handler = (value: unknown) => Promise<unknown>;

jest.mock('@/lib/api-client', () => {
  const actual = jest.requireActual('@/lib/api-client');
  const responseErrorHandlers: Handler[] = [];
  const requestHandlers: Handler[] = [];
  const makeClient = () =>
    Object.assign(jest.fn(() => Promise.resolve({ data: { retried: true } })), {
      interceptors: {
        request: {
          use: jest.fn((onOk: Handler) => {
            requestHandlers.push(onOk);
          }),
        },
        response: {
          use: jest.fn((_onOk: unknown, onErr?: Handler) => {
            if (onErr) responseErrorHandlers.push(onErr);
          }),
        },
      },
    });
  return {
    axios: { post: jest.fn() },
    createApiClient: jest.fn(() => makeClient()),
    singleFlight: actual.singleFlight,
    __responseErrorHandlers: responseErrorHandlers,
    __requestHandlers: requestHandlers,
  };
});

const mockLogout = jest.fn(() => Promise.resolve());
const mockDiscard = jest.fn(() => Promise.resolve());
jest.mock('@/stores/authStore', () => {
  const { create } = jest.requireActual("zustand");
  return {
    useAuthStore: create(() => ({ isAuthenticated: true, token: 'a-token', logout: mockLogout })),
    isLogoutInProgress: () => false,
    // Fabrika import sırasında çalışır (mockDiscard henüz atanmamış) — geç bağla.
    discardStoredSession: () => mockDiscard(),
  };
});

jest.mock('@/services/sentry', () => ({ captureException: jest.fn(), addBreadcrumb: jest.fn(), setUser: jest.fn() }));

import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';
import { axios } from '@/lib/api-client';
import { useAuthStore } from '@/stores/authStore';
import { isNoResponseNetworkError } from '@/lib/network/networkFailure';
import {
  SESSION_PROBE,
  SESSION_STALE,
  advanceSessionEpoch,
  getSessionEpoch,
  isSessionStaleError,
  setSessionDeferred,
} from '../client';

const mocked = jest.requireMock("@/lib/api-client") as {
  __responseErrorHandlers: Handler[];
  __requestHandlers: Handler[];
};
// Kayıt sırası — request: api Accept-Language, guestApi Accept-Language, api token;
// response hata: ilk kayıt api'nin ban/401/refresh işleyicisi.
const onResponseError = mocked.__responseErrorHandlers[0];

type RequestConfig = {
  url?: string;
  headers: Record<string, string>;
  _sentAsGuest?: boolean;
};
type Rejection = {
  code?: string;
  status?: number;
  response?: unknown;
  config: { url?: string };
};

const tokenRequestHandler = mocked.__requestHandlers[2] as (config: unknown) => Promise<RequestConfig>;

const mockPost = axios.post as unknown as jest.Mock;
const mockGetItem = SecureStore.getItemAsync as unknown as jest.Mock;
const mockDeleteItem = SecureStore.deleteItemAsync as unknown as jest.Mock;

const error401 = (config: Record<string, unknown> = {}) => ({
  isAxiosError: true,
  config: { url: '/users/me', headers: {} as Record<string, string>, ...config },
  response: { status: 401, headers: {}, data: {} },
});

/** İsteği token interceptor'ından geçirip 401 ile reddeder (gerçek akıştaki config). */
const sentThenUnauthorized = async (extra: Record<string, unknown> = {}) => {
  const config = await tokenRequestHandler({ url: '/cart', headers: {}, ...extra });
  return error401(config);
};

const rejectionOf = (error: unknown) =>
  onResponseError(error).then(
    () => {
      throw new Error('expected rejection');
    },
    (e) => e as Rejection,
  );

const refreshRejected = (status: number) =>
  Object.assign(new Error(`Request failed with status code ${status}`), {
    isAxiosError: true,
    response: { status, data: {}, headers: {} },
  });

beforeEach(() => {
  jest.clearAllMocks();
  setSessionDeferred(false);
  useAuthStore.setState({ token: 'a-token', logout: mockLogout });
  mockLogout.mockImplementation(() => Promise.resolve());
  mockGetItem.mockImplementation(async (key: string) =>
    key === 'refreshToken' ? 'a-refresh' : 'a-token',
  );
});

afterAll(() => setSessionDeferred(false));

describe('A — ertelenmiş oturum: istekler misafir gider', () => {
  it('ertelenmişken Authorization eklenmez', async () => {
    setSessionDeferred(true);
    const config = await tokenRequestHandler({ url: '/cart', headers: {} });
    expect(config.headers.Authorization).toBeUndefined();
    expect(config._sentAsGuest).toBe(true);
  });

  it('SESSION_PROBE ertelenmişken de saklı token’ı taşır', async () => {
    setSessionDeferred(true);
    const config = await tokenRequestHandler({ url: '/users/me', headers: {}, ...SESSION_PROBE });
    expect(config.headers.Authorization).toBe('Bearer a-token');
  });

  it('ertelenmemiş oturumda davranış aynı: Bearer eklenir', async () => {
    const config = await tokenRequestHandler({ url: '/cart', headers: {} });
    expect(config.headers.Authorization).toBe('Bearer a-token');
    expect(config._sentAsGuest).toBeUndefined();
  });

  it('misafir olarak giden isteğin 401’i: refresh / çıkış / yönlendirme yok, asıl hata döner', async () => {
    setSessionDeferred(true);
    const error = await sentThenUnauthorized();

    const rejection = await rejectionOf(error);

    expect(rejection).toBe(error);
    expect(mockPost).not.toHaveBeenCalled();
    expect(mockLogout).not.toHaveBeenCalled();
    expect(mockDiscard).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('probe’un refresh’i kesin reddedildi: oturum sessizce atılır — zorunlu çıkış ve login yönlendirmesi yok', async () => {
    setSessionDeferred(true);
    mockPost.mockRejectedValueOnce(refreshRejected(401));
    const error = await sentThenUnauthorized({ ...SESSION_PROBE });

    await rejectionOf(error);

    expect(mockDiscard).toHaveBeenCalledTimes(1);
    expect(mockLogout).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('ertelenmemiş oturumda kesin red eskisi gibi: zorunlu çıkış + login', async () => {
    mockPost.mockRejectedValueOnce(refreshRejected(401));
    const error = await sentThenUnauthorized();

    await rejectionOf(error);

    expect(mockLogout).toHaveBeenCalledWith({ reason: 'forced' });
    expect(router.replace).toHaveBeenCalledWith('/(auth)/login');
    expect(mockDiscard).not.toHaveBeenCalled();
  });
});

describe('B — bayat oturum: asıl 401 yerine SESSION_STALE', () => {
  const expectStale = (rejection: Rejection, original: { config: { url?: string } }) => {
    expect(rejection).not.toBe(original);
    expect(rejection.code).toBe(SESSION_STALE);
    expect(isSessionStaleError(rejection)).toBe(true);
    expect(rejection.response).toBeUndefined();
    expect(rejection.status).toBeUndefined();
    expect(rejection.config.url).toBe(original.config.url);
    // Ağ hatası sayılmaz (çevrimdışı toast süzgeci).
    expect(isNoResponseNetworkError(rejection)).toBe(false);
  };

  it('refresh yanıtı beklenirken oturum değişti (stale)', async () => {
    let resolveRefresh: (v: unknown) => void = () => undefined;
    mockPost.mockReturnValueOnce(new Promise((r) => (resolveRefresh = r)));
    const error = await sentThenUnauthorized();

    const pending = rejectionOf(error);
    await Promise.resolve();
    advanceSessionEpoch(); // A çıktı, B giriş yaptı
    resolveRefresh({ data: { accessToken: 'a-refreshed' } });

    expectStale(await pending, error);
    expect(mockLogout).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('refresh "invalid" ama kuşak ilerledi (çıkış token’ları silerken okundu)', async () => {
    let resolveRead: (v: string | null) => void = () => undefined;
    const error = await sentThenUnauthorized();
    mockGetItem.mockImplementation((key: string) =>
      key === 'refreshToken' ? new Promise((r) => (resolveRead = r)) : Promise.resolve('b-token'),
    );

    const pending = rejectionOf(error);
    await Promise.resolve();
    advanceSessionEpoch();
    resolveRead(null); // token yok → invalid

    expectStale(await pending, error);
    expect(mockLogout).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('kapanmış oturumda başlamış isteğin 401’i', async () => {
    const error = await sentThenUnauthorized();
    advanceSessionEpoch();

    expectStale(await rejectionOf(error), error);
    expect(mockPost).not.toHaveBeenCalled();
  });
});

describe('B — handleAuthFailure yedek temizliği kuşağı ilerletir', () => {
  it('logout fırlatırsa token’lar silinir VE kuşak ilerler', async () => {
    mockLogout.mockImplementationOnce(() => Promise.reject(new Error('store kaput')));
    mockPost.mockRejectedValueOnce(refreshRejected(401));
    const error = await sentThenUnauthorized();
    const epoch = getSessionEpoch();

    await rejectionOf(error);

    expect(getSessionEpoch()).toBe(epoch + 1);
    expect(mockDeleteItem).toHaveBeenCalledWith('accessToken');
    expect(mockDeleteItem).toHaveBeenCalledWith('refreshToken');
  });
});
