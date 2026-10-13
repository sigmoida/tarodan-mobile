/**
 * B-5.6a · Maestro auto-login: gömülü demo kimlik bilgisi yok, tek kapı.
 *
 * Kimlik bilgisi YALNIZ env'den gelir ve kapı `src/config/maestro.ts`
 * (`EXPO_PUBLIC_MAESTRO=1`, derleme anı). `__DEV__`'e bağlı DEĞİL: staging
 * release build'inde de çalışmalı. Kapı ve eas.json koruması
 * `src/config/__tests__/maestro.test.ts`'te; burada `loadToken` davranışı.
 */
jest.mock('@/lib/api', () => ({
  authApi: { login: jest.fn(), logout: jest.fn(() => Promise.resolve()) },
  userApi: { getProfile: jest.fn() },
  advanceSessionEpoch: jest.fn(),
}));
jest.mock('../../services/push', () => ({
  unregisterPushNotifications: jest.fn(() => Promise.resolve()),
}));
jest.mock('../resetUserStores', () => ({
  resetUserStores: jest.fn(),
  resetServerStateForNewSession: jest.fn(() => Promise.resolve()),
}));

const ENV_KEYS = [
  'EXPO_PUBLIC_MAESTRO',
  'EXPO_PUBLIC_MAESTRO_NO_AUTOLOGIN',
  'EXPO_PUBLIC_MAESTRO_EMAIL',
  'EXPO_PUBLIC_MAESTRO_PASSWORD',
] as const;
type Env = Partial<Record<(typeof ENV_KEYS)[number], string>>;
const savedEnv: Record<string, string | undefined> = {};
const g = globalThis as unknown as { __DEV__: boolean };
let savedDev: boolean;
let warnSpy: jest.SpyInstance;

/**
 * Kapı sabitleri modül yüklenirken okunduğu için store'u verilen env ile
 * SIFIRDAN yükler; mock'ları da aynı (izole) kayıt defterinden döndürür.
 */
function loadStore(env: Env, storedToken: string | null = null) {
  ENV_KEYS.forEach((k) => {
    if (env[k] === undefined) delete process.env[k];
    else process.env[k] = env[k];
  });
  let mods!: {
    useAuthStore: typeof import('../authStore').useAuthStore;
    login: jest.Mock;
    secure: { getItemAsync: jest.Mock; deleteItemAsync: jest.Mock };
  };
  jest.isolateModules(() => {
    const secure = require('expo-secure-store');
    secure.getItemAsync.mockResolvedValue(storedToken);
    mods = {
      useAuthStore: require('../authStore').useAuthStore,
      login: require('@/lib/api').authApi.login,
      secure,
    };
  });
  return mods;
}

const CREDS: Env = { EXPO_PUBLIC_MAESTRO_EMAIL: 'qa@example.com', EXPO_PUBLIC_MAESTRO_PASSWORD: 'pw' };

beforeEach(() => {
  ENV_KEYS.forEach((k) => {
    savedEnv[k] = process.env[k];
  });
  savedDev = g.__DEV__;
  warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  ENV_KEYS.forEach((k) => {
    if (savedEnv[k] === undefined) delete process.env[k];
    else process.env[k] = savedEnv[k];
  });
  g.__DEV__ = savedDev;
  warnSpy.mockRestore();
});

describe('loadToken · token yokken', () => {
  it('MAESTRO=1 ama kimlik env\'de yok → login DENENMEZ, uyarı basılır', async () => {
    const { useAuthStore, login } = loadStore({ EXPO_PUBLIC_MAESTRO: '1' });
    await useAuthStore.getState().loadToken();
    expect(login).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().isLoading).toBe(false);
  });

  it('kapı kapalı (production) → env\'de kimlik olsa bile login denenmez', async () => {
    const { useAuthStore, login } = loadStore({ ...CREDS });
    await useAuthStore.getState().loadToken();
    expect(login).not.toHaveBeenCalled();
  });

  it('MAESTRO=1 + kimlik → release build\'inde de (__DEV__=false) env kimliğiyle login', async () => {
    g.__DEV__ = false;
    const { useAuthStore, login } = loadStore({ EXPO_PUBLIC_MAESTRO: '1', ...CREDS });
    login.mockResolvedValue({ data: {} });
    await useAuthStore.getState().loadToken();
    expect(login).toHaveBeenCalledTimes(1);
    expect(login).toHaveBeenCalledWith('qa@example.com', 'pw');
  });
});

describe('loadToken · NO_AUTOLOGIN', () => {
  it('MAESTRO=1 + NO_AUTOLOGIN=1 → kayıtlı token silinir, misafir başlanır', async () => {
    const { useAuthStore, login, secure } = loadStore(
      { EXPO_PUBLIC_MAESTRO: '1', EXPO_PUBLIC_MAESTRO_NO_AUTOLOGIN: '1', ...CREDS },
      'stale-token',
    );
    await useAuthStore.getState().loadToken();
    expect(secure.deleteItemAsync).toHaveBeenCalledWith('accessToken');
    expect(login).not.toHaveBeenCalled();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it('NO_AUTOLOGIN tek başına (kapı kapalı) token\'a dokunmaz', async () => {
    const { useAuthStore, secure } = loadStore({ EXPO_PUBLIC_MAESTRO_NO_AUTOLOGIN: '1' }, null);
    await useAuthStore.getState().loadToken();
    expect(secure.deleteItemAsync).not.toHaveBeenCalled();
  });
});
