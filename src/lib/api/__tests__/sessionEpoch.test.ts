/**
 * Oturum kuşağı — çıkış, uçuştaki refresh'i geçersizleştirmeli.
 *
 * Yarış (denetim 2026-08-03, T9): A çıkarken bir refresh uçuşta olabilir.
 * Refresh tamamlanınca `SecureStore.setItemAsync("accessToken", …)` çalışıyor.
 * Bu arada B giriş yaptıysa **B'nin token'ı A'nınkiyle eziliyor** ve request
 * interceptor'ı token'ı SecureStore'dan okuduğu için **B'nin tüm istekleri
 * A'nın token'ıyla gidiyor**. Plan 4'te eklenen store guard yalnız store
 * yarısını kapatıyordu; asıl sızıntı SecureStore yazımı.
 *
 * Sözleşme: refresh, yazımdan ÖNCE kuşağı kontrol eder; kuşak ilerlemişse
 * hiçbir şey yazmaz ve null döner (çağıran normal auth-failure yoluna düşer).
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

jest.mock('@/services/sentry', () => ({ captureException: jest.fn() }));

import * as SecureStore from 'expo-secure-store';
import { axios } from '@/lib/api-client';
import { useAuthStore } from '@/stores/authStore';
import { advanceSessionEpoch } from '../client';

const onResponseError = (jest.requireMock('@/lib/api-client') as any)
  .__responseErrorHandlers[0] as (error: any) => Promise<any>;

const mockPost = axios.post as unknown as jest.Mock;
const mockSetItem = SecureStore.setItemAsync as unknown as jest.Mock;
const mockGetItem = SecureStore.getItemAsync as unknown as jest.Mock;

const error401 = () => ({
  config: { headers: {} as Record<string, string> },
  response: { status: 401, headers: {}, data: {} },
});

beforeEach(() => {
  jest.clearAllMocks();
  useAuthStore.setState({ token: 'a-token', logout: jest.fn() });
  mockGetItem.mockImplementation(async (key: string) =>
    key === 'refreshToken' ? 'a-refresh' : 'a-token',
  );
});

describe('session epoch', () => {
  it('discards an in-flight refresh that finishes after a logout', async () => {
    let resolveRefresh: (value: unknown) => void = () => {};
    mockPost.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveRefresh = resolve;
      }),
    );

    const pending = onResponseError(error401()).catch(() => undefined);

    // A çıkıyor; B giriş yapıp kendi token'ını yazıyor.
    advanceSessionEpoch();
    mockSetItem.mockClear();
    useAuthStore.setState({ token: 'b-token' });

    resolveRefresh({ data: { accessToken: 'a-refreshed', refreshToken: 'a-rotated' } });
    await pending;

    expect(mockSetItem).not.toHaveBeenCalledWith('accessToken', 'a-refreshed');
    expect(mockSetItem).not.toHaveBeenCalledWith('refreshToken', 'a-rotated');
    expect(useAuthStore.getState().token).toBe('b-token');
  });

  it('still writes a refresh that finishes within the same session', async () => {
    mockPost.mockResolvedValueOnce({
      data: { accessToken: 'fresh', refreshToken: 'rotated' },
    });

    await onResponseError(error401());

    expect(mockSetItem).toHaveBeenCalledWith('accessToken', 'fresh');
    expect(mockSetItem).toHaveBeenCalledWith('refreshToken', 'rotated');
    expect(useAuthStore.getState().token).toBe('fresh');
  });
});
