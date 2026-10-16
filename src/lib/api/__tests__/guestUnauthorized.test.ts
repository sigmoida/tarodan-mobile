/**
 * Gerçek misafir (token yok, arayüz misafir) korumalı bir uçtan 401 alırsa login'e ATILMAZ:
 * 401 "giriş gerekli" demektir, oturum bitmedi. Refresh / zorunlu çıkış (misafir sepeti
 * sıfırlanırdı) / yönlendirme yok; misafir bulunduğu ekranda kalır, girişi gerektiren ekranlar
 * kendini kapılar. Arayüz oturumu açık gösterirken token'sız giden istek ise bozuk oturumdur —
 * eskisi gibi zorunlu çıkış + login.
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

const mockLogout = jest.fn((_options?: unknown) => Promise.resolve());
const mockDiscard = jest.fn(() => Promise.resolve());
jest.mock('@/stores/authStore', () => {
  const { create } = jest.requireActual('zustand');
  return {
    // Fabrika import sırasında çalışır (mock'lar henüz atanmamış) — geç bağla.
    useAuthStore: create(() => ({
      isAuthenticated: false,
      token: null,
      logout: (options: unknown) => mockLogout(options),
    })),
    isLogoutInProgress: () => false,
    discardStoredSession: () => mockDiscard(),
  };
});

jest.mock('@/services/sentry', () => ({ captureException: jest.fn(), addBreadcrumb: jest.fn(), setUser: jest.fn() }));

import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';
import { axios } from '@/lib/api-client';
import { useAuthStore } from '@/stores/authStore';
import '../client';

const mocked = jest.requireMock('@/lib/api-client') as {
  __responseErrorHandlers: Handler[];
  __requestHandlers: Handler[];
};
const onResponseError = mocked.__responseErrorHandlers[0];
const tokenRequestHandler = mocked.__requestHandlers[2] as (config: unknown) => Promise<Record<string, unknown>>;
const mockPost = axios.post as unknown as jest.Mock;
const mockGetItem = SecureStore.getItemAsync as unknown as jest.Mock;

const sentThenUnauthorized = async () => {
  const config = await tokenRequestHandler({ url: '/wishlist', headers: {} });
  return {
    isAxiosError: true,
    config,
    response: { status: 401, headers: {}, data: {} },
  };
};

beforeEach(() => {
  jest.clearAllMocks();
  mockGetItem.mockImplementation(() => Promise.resolve(null));
});

it('gerçek misafir: 401 çağırana gider; refresh / çıkış / login yönlendirmesi YOK', async () => {
  useAuthStore.setState({ isAuthenticated: false, token: null });
  const error = await sentThenUnauthorized();

  await expect(onResponseError(error)).rejects.toBe(error);

  expect(mockPost).not.toHaveBeenCalled();
  expect(mockLogout).not.toHaveBeenCalled();
  expect(mockDiscard).not.toHaveBeenCalled();
  expect(router.replace).not.toHaveBeenCalled();
});

it('arayüz misafirken saklı (geçersiz) token’la giden isteğin kesin reddi: sessizce atılır, yönlendirme yok', async () => {
  useAuthStore.setState({ isAuthenticated: false, token: null });
  mockGetItem.mockImplementation((k: string) =>
    Promise.resolve(k === 'accessToken' ? 'stale' : k === 'refreshToken' ? 'rt' : null),
  );
  mockPost.mockRejectedValueOnce({ response: { status: 401, data: {} } });
  const error = await sentThenUnauthorized();

  await onResponseError(error).catch(() => undefined);

  expect(mockDiscard).toHaveBeenCalled();
  expect(mockLogout).not.toHaveBeenCalled();
  expect(router.replace).not.toHaveBeenCalled();
});

it('arayüz oturumu açık gösterirken token’sız istek: bozuk oturum → zorunlu çıkış + login', async () => {
  useAuthStore.setState({ isAuthenticated: true, token: 'gone' });
  const error = await sentThenUnauthorized();

  await onResponseError(error).catch(() => undefined);

  expect(mockLogout).toHaveBeenCalledWith({ reason: 'forced' });
  expect(router.replace).toHaveBeenCalledWith('/(auth)/login');
});
