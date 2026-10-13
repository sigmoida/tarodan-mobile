/**
 * Misafir ödeme istekleri `guestApi`'den gider (gerçek `client.ts` interceptor'ları).
 *
 * `api` instance'ı cihazda kalmış bir access token'ı `Authorization` olarak
 * ekler, 401'de refresh dener ve olmazsa `logout()` + login'e `router.replace`
 * yapar; 403 `USER_BANNED`'da `/banned`'a yönlendirir. Misafir ödemesi bu
 * yoldan geçerse ödeme ortasında login ekranına düşebilir. Misafir verify,
 * confirm-failed ve direct-form (initiate-guest ve status-guest gibi)
 * `guestApi` tabanlı sarmalayıcıdan geçmeli; üye yolu `api`'den.
 *
 * Gerçek axios instance'ları + test adaptörü: başlıklar interceptor'lardan
 * SONRA, tel üzerindeki hâliyle doğrulanır.
 */
jest.mock('expo-router', () => ({
  router: { replace: jest.fn(), push: jest.fn(), back: jest.fn() },
}));

jest.mock('@/lib/api-client', () => {
  const actual = jest.requireActual('@/lib/api-client');
  // Çıplak axios yalnız `/auth/refresh` için kullanılıyor: yenileme başarısız.
  return { ...actual, axios: { ...actual.axios, post: jest.fn(() => Promise.reject(new Error('refresh failed'))) } };
});

jest.mock('@/stores/authStore', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { create } = require('zustand');
  return { useAuthStore: create(() => ({ token: 'stale-access', logout: jest.fn(() => Promise.resolve()) })) };
});

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import type { AxiosAdapter, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';
import { axios } from '@/lib/api-client';
import { useAuthStore } from '@/stores/authStore';
import { api, guestApi } from '../client';
import { paymentsApi } from '../checkout';
import { __resetPaymentCapabilities } from '@/lib/payment/paymentCapability';

const PAY = 'pay-1';
const GROUP = 'group-1';

type Reply = { status: number; data: unknown };
let reply: (config: InternalAxiosRequestConfig) => Reply;
const sent: Array<{ instance: 'api' | 'guestApi'; config: InternalAxiosRequestConfig }> = [];

const adapterFor =
  (instance: 'api' | 'guestApi'): AxiosAdapter =>
  async (config) => {
    sent.push({ instance, config });
    const { status, data } = reply(config);
    const response = { status, data, headers: {}, config, statusText: String(status) } as AxiosResponse;
    if (status >= 400) {
      throw Object.assign(new Error(`HTTP ${status}`), { config, response, isAxiosError: true });
    }
    return response;
  };

const headerOf = (config: InternalAxiosRequestConfig, name: string) =>
  (config.headers as unknown as { get?: (n: string) => unknown })?.get?.(name) ??
  (config.headers as unknown as Record<string, unknown>)[name];

const logout = () => useAuthStore.getState().logout as jest.Mock;

beforeAll(() => {
  api.defaults.adapter = adapterFor('api');
  guestApi.defaults.adapter = adapterFor('guestApi');
});

beforeEach(async () => {
  jest.clearAllMocks();
  sent.length = 0;
  __resetPaymentCapabilities();
  // Cihazda önceki oturumdan kalmış (bayat) token'lar DURUYOR: `api` bunları ekler.
  (SecureStore.getItemAsync as jest.Mock).mockImplementation(async (key: string) =>
    key === 'accessToken' ? 'stale-access' : key === 'refreshToken' ? 'stale-refresh' : null,
  );
  reply = (config) =>
    config.url === '/payments/initiate-guest'
      ? { status: 200, data: { paymentId: PAY, paymentAccessToken: 'cap-token' } }
      : config.url === '/payments/direct-form'
        ? { status: 200, data: { paymentId: PAY, action: 'https://www.paytr.com/odeme', fields: [] } }
        : { status: 200, data: { status: 'pending' } };
  await paymentsApi.initiateGroupGuest(GROUP);
  sent.length = 0;
});

const guestCalls: Array<[string, () => Promise<unknown>, string]> = [
  ['status-guest', () => paymentsApi.getStatusLightGuest(PAY), `/payments/${PAY}/status-guest`],
  ['verify', () => paymentsApi.verifyGuest(PAY), `/payments/${PAY}/verify`],
  ['confirm-failed', () => paymentsApi.confirmFailedGuest(PAY), `/payments/${PAY}/confirm-failed`],
  [
    'direct-form',
    () => paymentsApi.directFormGuest({ checkoutGroupId: GROUP, paymentId: PAY, saveCard: false }),
    '/payments/direct-form',
  ],
];

describe.each(guestCalls)('misafir %s', (_label, call, url) => {
  it('guestApi\'den gider: Authorization YOK, yetki belirteci VAR', async () => {
    await call();
    expect(sent).toHaveLength(1);
    expect(sent[0].instance).toBe('guestApi');
    expect(sent[0].config.url).toBe(url);
    expect(headerOf(sent[0].config, 'Authorization')).toBeUndefined();
    expect(headerOf(sent[0].config, 'X-Payment-Capability')).toBe('cap-token');
  });

  it('401: hata çağırana döner; refresh, logout ve login yönlendirmesi YOK', async () => {
    reply = () => ({ status: 401, data: { message: 'Unauthorized' } });
    await expect(call()).rejects.toMatchObject({ response: { status: 401 } });
    expect(axios.post).not.toHaveBeenCalled();
    expect(logout()).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
    expect(sent).toHaveLength(1); // yeniden deneme yok
  });

  it('403 USER_BANNED: /banned yönlendirmesi YOK', async () => {
    reply = () => ({ status: 403, data: { errorCode: 'USER_BANNED' } });
    await expect(call()).rejects.toMatchObject({ response: { status: 403 } });
    expect(router.replace).not.toHaveBeenCalled();
  });
});

describe('üye yolu api\'den (karşılaştırma: testin ayırt ediciliği)', () => {
  it('üye verify Bearer taşır; 401\'de refresh → olmazsa logout + login', async () => {
    jest.spyOn(console, 'warn').mockImplementation(() => undefined); // "[auth] silent logout" (__DEV__)
    reply = () => ({ status: 401, data: { message: 'Unauthorized' } });
    await expect(paymentsApi.verify(PAY)).rejects.toMatchObject({ response: { status: 401 } });
    expect(sent[0].instance).toBe('api');
    expect(headerOf(sent[0].config, 'Authorization')).toBe('Bearer stale-access');
    expect(headerOf(sent[0].config, 'X-Payment-Capability')).toBe('cap-token');
    expect(axios.post).toHaveBeenCalled();
    expect(logout()).toHaveBeenCalled();
    expect(router.replace).toHaveBeenCalledWith('/(auth)/login');
  });

  it.each([
    ['confirm-failed', () => paymentsApi.confirmFailed(PAY)],
    ['direct-form', () => paymentsApi.directForm({ checkoutGroupId: GROUP, paymentId: PAY })],
    ['status', () => paymentsApi.getStatusLight(PAY)],
  ])('üye %s api\'den gider', async (_label, call) => {
    await call();
    expect(sent[0].instance).toBe('api');
    expect(headerOf(sent[0].config, 'Authorization')).toBe('Bearer stale-access');
  });
});
