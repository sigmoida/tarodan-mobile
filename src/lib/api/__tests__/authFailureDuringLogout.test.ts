/**
 * 401 → `handleAuthFailure` çıkış sırasında / kapanmış oturumda tekrar çıkış yaptırmamalı.
 *
 * Hesap silme döngüsü: çıkış, silinmiş hesabın token'ıyla push iptali atar → 401 →
 * refresh 401 → `handleAuthFailure` → `logout` → … Ayrıca silme/çıkış sonrası geç dönen bir
 * 401 kullanıcıyı ana sayfadan login'e atardı.
 * - Çıkış sürerken (`isLogoutInProgress`) `handleAuthFailure` hiçbir şey yapmaz (beklemez de —
 *   süren çıkış bu isteğin bitmesini bekliyor olabilir).
 * - Kapanmış bir oturum kuşağında başlamış isteğin 401'i refresh/çıkış/yönlendirme tetiklemez.
 */
jest.mock('expo-router', () => ({
  router: { replace: jest.fn(), push: jest.fn(), back: jest.fn() },
}));

jest.mock('@/lib/api-client', () => {
  const actual = jest.requireActual('@/lib/api-client');
  const responseErrorHandlers: any[] = [];
  const requestHandlers: any[] = [];
  const makeClient = () => {
    const client: any = jest.fn(() => Promise.resolve({ data: {} }));
    client.interceptors = {
      request: {
        use: jest.fn((onOk: any) => {
          requestHandlers.push(onOk);
        }),
      },
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
    __requestHandlers: requestHandlers,
  };
});

let mockLogoutInProgress = false;
const mockLogout = jest.fn(() => Promise.resolve());
jest.mock('@/stores/authStore', () => {
  const { create } = require('zustand');
  return {
    useAuthStore: create(() => ({ token: 'a-token', logout: mockLogout })),
    isLogoutInProgress: () => mockLogoutInProgress,
  };
});

jest.mock('@/services/sentry', () => ({ captureException: jest.fn(), addBreadcrumb: jest.fn(), setUser: jest.fn() }));

import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';
import { axios } from '@/lib/api-client';
import { useAuthStore } from '@/stores/authStore';
import { advanceSessionEpoch } from '../client';

const mocked = jest.requireMock('@/lib/api-client') as any;
// client.ts kayıt sırası — request: api Accept-Language, guestApi Accept-Language, api token;
// response hata: ilk kayıt api'nin ban/401/refresh işleyicisi.
const onResponseError = mocked.__responseErrorHandlers[0] as (error: any) => Promise<any>;
const tokenRequestHandler = mocked.__requestHandlers[2] as (config: any) => Promise<any>;

const mockPost = axios.post as unknown as jest.Mock;
const mockGetItem = SecureStore.getItemAsync as unknown as jest.Mock;

const error401 = (config: Record<string, unknown> = {}) => ({
  config: { headers: {} as Record<string, string>, ...config },
  response: { status: 401, headers: {}, data: {} },
});

beforeEach(() => {
  jest.clearAllMocks();
  mockLogoutInProgress = false;
  useAuthStore.setState({ token: 'a-token', logout: mockLogout });
  mockGetItem.mockImplementation(async (key: string) =>
    key === 'refreshToken' ? 'a-refresh' : 'a-token',
  );
  // Refresh de reddediliyor (silinmiş hesap / iptal edilmiş refresh token).
  mockPost.mockRejectedValue({ response: { status: 401 } });
});

it('çıkış sürmüyorsa: refresh düşünce zorunlu çıkış + login (davranış korunur)', async () => {
  await expect(onResponseError(error401())).rejects.toBeDefined();
  expect(mockLogout).toHaveBeenCalledWith({ reason: 'forced' });
  expect(router.replace).toHaveBeenCalledWith('/(auth)/login');
});

it('çıkış sürerken: ikinci çıkış ve yönlendirme yok, hata çağırana döner', async () => {
  mockLogoutInProgress = true;
  await expect(onResponseError(error401())).rejects.toBeDefined();
  expect(mockLogout).not.toHaveBeenCalled();
  expect(router.replace).not.toHaveBeenCalled();
});

it('kapanmış oturumda başlamış isteğin 401\'i: refresh, çıkış, yönlendirme yok', async () => {
  const config = await tokenRequestHandler({ headers: {} });
  expect(typeof config._sessionEpoch).toBe('number');
  advanceSessionEpoch(); // istek uçuştayken çıkış (ör. hesap silindi)

  await expect(onResponseError(error401(config))).rejects.toBeDefined();
  expect(mockPost).not.toHaveBeenCalled();
  expect(mockLogout).not.toHaveBeenCalled();
  expect(router.replace).not.toHaveBeenCalled();
});

describe('çıkış sürerken token yenileme yazılmaz (kapanan oturum dirilmez)', () => {
  const mockSetItem = SecureStore.setItemAsync as unknown as jest.Mock;

  it('çıkışın kendi isteği 401 alırsa refresh hiç atılmaz, SecureStore\'a yazılmaz', async () => {
    mockLogoutInProgress = true;
    mockPost.mockResolvedValue({ data: { accessToken: 'revived', refreshToken: 'revived-r' } });
    await expect(onResponseError(error401())).rejects.toBeDefined();
    expect(mockPost).not.toHaveBeenCalled();
    expect(mockSetItem).not.toHaveBeenCalled();
    expect(useAuthStore.getState().token).toBe('a-token');
  });

  it('yanıt beklenirken çıkış başladı (kuşak aynı): token yazılmaz/uygulanmaz', async () => {
    let resolveRefresh: (v: unknown) => void = () => undefined;
    mockPost.mockReturnValueOnce(new Promise((r) => (resolveRefresh = r)));
    const pending = onResponseError(error401()).catch(() => undefined);
    for (let i = 0; i < 50 && mockPost.mock.calls.length === 0; i++) await Promise.resolve();
    expect(mockPost).toHaveBeenCalledTimes(1);

    mockLogoutInProgress = true; // çıkış başladı (kuşak henüz ilerlemedi)
    resolveRefresh({ data: { accessToken: 'revived', refreshToken: 'revived-r' } });
    await pending;

    expect(mockSetItem).not.toHaveBeenCalled();
    expect(useAuthStore.getState().token).toBe('a-token');
    expect(mockLogout).not.toHaveBeenCalled();
  });
});

it('aynı oturumdaki isteğin 401\'i normal yoldan (refresh denenir)', async () => {
  const config = await tokenRequestHandler({ headers: {} });
  await expect(onResponseError(error401(config))).rejects.toBeDefined();
  expect(mockPost).toHaveBeenCalledTimes(1);
  expect(mockLogout).toHaveBeenCalledWith({ reason: 'forced' });
});
