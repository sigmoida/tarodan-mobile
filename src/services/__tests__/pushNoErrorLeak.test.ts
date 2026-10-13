/**
 * Gizlilik: push token iptali başarısız olunca AxiosError (Authorization başlığı,
 * gövde) release günlüğüne ham basılmaz; yalnız güvenli özet.
 */
jest.mock('expo-device', () => ({ isDevice: true, modelName: 'Pixel' }));
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { executionEnvironment: 'standalone', expoConfig: { extra: { eas: { projectId: 'proj-1' } } } },
}));
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getExpoPushTokenAsync: jest.fn(async () => {
    const { AxiosError, AxiosHeaders } = require('axios');
    const config = { url: '/notifications/push-token', method: 'post', headers: new AxiosHeaders({ Authorization: 'Bearer SECRET-TOKEN' }) };
    throw new AxiosError('Request failed with status code 500', 'ERR_BAD_RESPONSE', config, {}, {
      status: 500, statusText: '', headers: {}, config, data: { leak: 'RESP-SECRET' },
    });
  }),
}));
jest.mock('@/lib/api', () => ({ api: { post: jest.fn(async () => ({})) } }));
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

import { unregisterPushNotifications } from '../push';

const g = globalThis as unknown as { __DEV__: boolean };

it('release: unregister hatası günlüğe token/gövde sızdırmaz', async () => {
  const saved = g.__DEV__;
  g.__DEV__ = false;
  const spies = (['log', 'warn', 'error'] as const).map((m) => jest.spyOn(console, m).mockImplementation(() => {}));
  try {
    await unregisterPushNotifications();
    const dump = JSON.stringify(spies.flatMap((s) => s.mock.calls), (_k, v) => (v instanceof Error ? { ...v } : v));
    expect(dump).toContain('unregistering push token');
    expect(dump).not.toContain('SECRET-TOKEN');
    expect(dump).not.toContain('RESP-SECRET');
  } finally {
    g.__DEV__ = saved;
    spies.forEach((s) => s.mockRestore());
  }
});
