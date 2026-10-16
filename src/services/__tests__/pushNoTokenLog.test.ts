/**
 * Gizlilik: push token'ı release cihaz günlüğüne yazılmaz. Token `logger.debug` ile
 * basılır; logger'ın minLevel'ı modül yüklenirken `__DEV__`'e göre seçilir (release'te
 * `info`), bu yüzden her senaryo modülü yeniden yükler.
 */
const TOKEN = 'ExponentPushToken[secret-abc]';

const g = globalThis as unknown as { __DEV__: boolean };
let savedDev: boolean;
let spies: jest.SpyInstance[];

beforeEach(() => {
  savedDev = g.__DEV__;
  spies = (['log', 'info', 'warn', 'error'] as const).map((m) =>
    jest.spyOn(console, m).mockImplementation(() => {}),
  );
});
afterEach(() => {
  g.__DEV__ = savedDev;
  spies.forEach((s) => s.mockRestore());
});

const logged = () => JSON.stringify(spies.flatMap((s) => s.mock.calls));

async function register(dev: boolean) {
  g.__DEV__ = dev;
  let result: string | null | undefined;
  await jest.isolateModulesAsync(async () => {
    jest.doMock('expo-device', () => ({ isDevice: true, modelName: 'Pixel' }));
    jest.doMock('expo-constants', () => ({
      __esModule: true,
      default: { executionEnvironment: 'standalone', expoConfig: { extra: { eas: { projectId: 'proj-1' } } } },
    }));
    jest.doMock('expo-notifications', () => ({
      setNotificationHandler: jest.fn(),
      getPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
      requestPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
      getExpoPushTokenAsync: jest.fn(async () => ({ data: TOKEN })),
      setNotificationChannelAsync: jest.fn(async () => undefined),
    }));
    jest.doMock('@/lib/api', () => ({ api: { post: jest.fn(async () => ({})) } }));
    jest.doMock('expo-router', () => ({ router: { push: jest.fn() } }));
    // Kayıt yalnız oturum açıkken yazılır.
    jest.doMock('@/stores/authStore', () => ({
      useAuthStore: { getState: () => ({ isAuthenticated: true }) },
    }));
    const { registerForPushNotifications } = require('../push');
    result = await registerForPushNotifications();
  });
  return result;
}

describe('registerForPushNotifications günlüğü', () => {
  it('release (__DEV__=false): token hiçbir konsol çağrısında geçmez', async () => {
    await expect(register(false)).resolves.toBe(TOKEN);
    expect(logged()).not.toContain('secret-abc');
    expect(logged()).not.toContain('Push token registered');
  });

  it('geliştirmede (__DEV__=true) token logger.debug ile yazılır', async () => {
    await register(true);
    expect(logged()).toContain('Push token registered');
  });
});
