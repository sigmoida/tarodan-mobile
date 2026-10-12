/**
 * B-5.6a · Maestro auto-login: gömülü demo kimlik bilgisi yok, yalnız dev build.
 *
 * Eskiden `EXPO_PUBLIC_MAESTRO_EMAIL/PASSWORD` yoksa koda gömülü demo hesabına
 * düşülüyordu. Artık kimlik bilgisi YALNIZ env'den gelir ve `__DEV__` false
 * (release / OTA bundle) iken hiçbir koşulda auto-login denenmez.
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

import * as SecureStore from 'expo-secure-store';
import { authApi } from '@/lib/api';
import { getMaestroAutoLoginCredentials, useAuthStore } from '../authStore';

const ENV_KEYS = [
  'EXPO_PUBLIC_MAESTRO',
  'EXPO_PUBLIC_MAESTRO_NO_AUTOLOGIN',
  'EXPO_PUBLIC_MAESTRO_EMAIL',
  'EXPO_PUBLIC_MAESTRO_PASSWORD',
] as const;
const savedEnv: Record<string, string | undefined> = {};
const g = globalThis as unknown as { __DEV__: boolean };
let savedDev: boolean;

beforeEach(() => {
  ENV_KEYS.forEach((k) => {
    savedEnv[k] = process.env[k];
  });
  savedDev = g.__DEV__;
  process.env.EXPO_PUBLIC_MAESTRO = '1';
  delete process.env.EXPO_PUBLIC_MAESTRO_NO_AUTOLOGIN;
  delete process.env.EXPO_PUBLIC_MAESTRO_EMAIL;
  delete process.env.EXPO_PUBLIC_MAESTRO_PASSWORD;
  g.__DEV__ = true;
  jest.clearAllMocks();
});

afterEach(() => {
  ENV_KEYS.forEach((k) => {
    if (savedEnv[k] === undefined) delete process.env[k];
    else process.env[k] = savedEnv[k];
  });
  g.__DEV__ = savedDev;
});

describe('getMaestroAutoLoginCredentials', () => {
  it('env\'de kimlik bilgisi yoksa null — gömülü varsayılan YOK', () => {
    expect(getMaestroAutoLoginCredentials()).toBeNull();
  });

  it('yalnız e-posta verilmişse null', () => {
    process.env.EXPO_PUBLIC_MAESTRO_EMAIL = 'qa@example.com';
    expect(getMaestroAutoLoginCredentials()).toBeNull();
  });

  it('dev + MAESTRO=1 + iki env → env değerleri', () => {
    process.env.EXPO_PUBLIC_MAESTRO_EMAIL = 'qa@example.com';
    process.env.EXPO_PUBLIC_MAESTRO_PASSWORD = 'pw';
    expect(getMaestroAutoLoginCredentials()).toEqual({ email: 'qa@example.com', password: 'pw' });
  });

  it('release (__DEV__=false) → env tam olsa bile null', () => {
    process.env.EXPO_PUBLIC_MAESTRO_EMAIL = 'qa@example.com';
    process.env.EXPO_PUBLIC_MAESTRO_PASSWORD = 'pw';
    g.__DEV__ = false;
    expect(getMaestroAutoLoginCredentials()).toBeNull();
  });

  it('MAESTRO kapalı ya da NO_AUTOLOGIN=1 → null', () => {
    process.env.EXPO_PUBLIC_MAESTRO_EMAIL = 'qa@example.com';
    process.env.EXPO_PUBLIC_MAESTRO_PASSWORD = 'pw';
    process.env.EXPO_PUBLIC_MAESTRO = '';
    expect(getMaestroAutoLoginCredentials()).toBeNull();
    process.env.EXPO_PUBLIC_MAESTRO = '1';
    process.env.EXPO_PUBLIC_MAESTRO_NO_AUTOLOGIN = '1';
    expect(getMaestroAutoLoginCredentials()).toBeNull();
  });
});

describe('loadToken · token yokken', () => {
  it('kimlik bilgisi env\'de yoksa login DENENMEZ (demo hesaba düşülmez)', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
    await useAuthStore.getState().loadToken();
    expect(authApi.login).not.toHaveBeenCalled();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().isLoading).toBe(false);
  });

  it('release\'te env tam olsa bile login denenmez', async () => {
    process.env.EXPO_PUBLIC_MAESTRO_EMAIL = 'qa@example.com';
    process.env.EXPO_PUBLIC_MAESTRO_PASSWORD = 'pw';
    g.__DEV__ = false;
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
    await useAuthStore.getState().loadToken();
    expect(authApi.login).not.toHaveBeenCalled();
  });

  it('dev + env tam → env kimliğiyle login denenir', async () => {
    process.env.EXPO_PUBLIC_MAESTRO_EMAIL = 'qa@example.com';
    process.env.EXPO_PUBLIC_MAESTRO_PASSWORD = 'pw';
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
    (authApi.login as jest.Mock).mockResolvedValue({ data: {} });
    await useAuthStore.getState().loadToken();
    expect(authApi.login).toHaveBeenCalledWith('qa@example.com', 'pw');
  });
});
