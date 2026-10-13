/**
 * Gizlilik: push token'ı release cihaz günlüğüne yazılmaz (`__DEV__` kapısı).
 */
const TOKEN = 'ExponentPushToken[secret-abc]';

jest.mock('expo-device', () => ({ isDevice: true, modelName: 'Pixel' }));
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { executionEnvironment: 'standalone', expoConfig: { extra: { eas: { projectId: 'proj-1' } } } },
}));
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  requestPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  getExpoPushTokenAsync: jest.fn(async () => ({ data: TOKEN })),
  setNotificationChannelAsync: jest.fn(async () => undefined),
}));
jest.mock('@/lib/api', () => ({ api: { post: jest.fn(async () => ({})) } }));
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

import { registerForPushNotifications } from '../push';

const g = globalThis as unknown as { __DEV__: boolean };
let savedDev: boolean;
let logSpy: jest.SpyInstance;

beforeEach(() => {
  savedDev = g.__DEV__;
  logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
});
afterEach(() => {
  g.__DEV__ = savedDev;
  logSpy.mockRestore();
});

const logged = () => JSON.stringify(logSpy.mock.calls);

describe('registerForPushNotifications günlüğü', () => {
  it('release (__DEV__=false): token hiçbir console.log çağrısında geçmez', async () => {
    g.__DEV__ = false;
    await expect(registerForPushNotifications()).resolves.toBe(TOKEN);
    expect(logged()).not.toContain('secret-abc');
    expect(logged()).not.toContain('Push token registered');
  });

  it('geliştirmede (__DEV__=true) token yine günlüğe yazılır', async () => {
    g.__DEV__ = true;
    await registerForPushNotifications();
    expect(logged()).toContain('Push token registered');
  });
});
