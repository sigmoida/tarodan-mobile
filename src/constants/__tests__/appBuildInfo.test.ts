/**
 * Settings build label: `1.2.3 (343) · a1b2c3 (Staging)`. The environment comes from
 * the same `buildEnvironment()` Sentry reports under, so these cases drive the real
 * inputs (EXPO_PUBLIC_ENVIRONMENT, __DEV__, the Maestro flag) rather than a mock.
 */
import i18n from '@/i18n/config';
import { formatAppBuildLabel, getAppBuildInfo, type AppBuildInfo } from '../appBuildInfo';

// The factories run when the hoisted import loads the module under test, before these
// objects exist, so they expose getters that read the current values at call time.
const mockUpdates: { updateId: string | null; isEmbeddedLaunch: boolean } = {
  updateId: null,
  isEmbeddedLaunch: true,
};
jest.mock('expo-updates', () => ({
  __esModule: true,
  get updateId() {
    return mockUpdates.updateId;
  },
  get isEmbeddedLaunch() {
    return mockUpdates.isEmbeddedLaunch;
  },
}));

const mockApplication: { nativeBuildVersion: string | null } = { nativeBuildVersion: null };
jest.mock('expo-application', () => ({
  __esModule: true,
  get nativeBuildVersion() {
    return mockApplication.nativeBuildVersion;
  },
}));

// `getAppVersion` reads `Constants.expoConfig.version` (mocking expo-constants itself breaks expo-asset).
const mockConfig: { version: string | null } = { version: '1.2.3' };
jest.mock('../appUpdate', () => ({ getAppVersion: () => mockConfig.version }));

const mockMaestro = { IS_MAESTRO: false };
jest.mock('@/config/maestro', () => ({
  __esModule: true,
  get IS_MAESTRO() {
    return mockMaestro.IS_MAESTRO;
  },
}));

const UPDATE_ID = 'a1b2c3d4-e5f6-4789-abcd-ef0123456789';
const g = globalThis as unknown as { __DEV__: boolean };
const saved = { env: process.env.EXPO_PUBLIC_ENVIRONMENT, dev: g.__DEV__ };

/** A store / staging release bundle running an OTA, build 343. */
function setBuild(over: {
  appEnvironment?: string;
  isDev?: boolean;
  isE2E?: boolean;
  version?: string;
  buildNumber?: string | null;
  updateId?: string | null;
  isEmbeddedLaunch?: boolean;
} = {}) {
  const env = 'appEnvironment' in over ? over.appEnvironment : 'preview';
  if (env === undefined) delete process.env.EXPO_PUBLIC_ENVIRONMENT;
  else process.env.EXPO_PUBLIC_ENVIRONMENT = env;
  g.__DEV__ = over.isDev ?? false;
  mockMaestro.IS_MAESTRO = over.isE2E ?? false;
  mockConfig.version = 'version' in over ? (over.version ?? null) : '1.2.3';
  mockApplication.nativeBuildVersion = 'buildNumber' in over ? over.buildNumber! : '343';
  mockUpdates.updateId = 'updateId' in over ? over.updateId! : UPDATE_ID;
  mockUpdates.isEmbeddedLaunch = over.isEmbeddedLaunch ?? false;
}

const en = i18n.getFixedT('en');
const tr = i18n.getFixedT('tr');
const label = (t = en) => formatAppBuildLabel(getAppBuildInfo(), t);

afterEach(() => {
  if (saved.env === undefined) delete process.env.EXPO_PUBLIC_ENVIRONMENT;
  else process.env.EXPO_PUBLIC_ENVIRONMENT = saved.env;
  g.__DEV__ = saved.dev;
});

describe('getAppBuildInfo', () => {
  it('returns the version, the native build number, the short OTA id and the environment', () => {
    setBuild();
    expect(getAppBuildInfo()).toEqual<AppBuildInfo>({
      version: '1.2.3',
      buildNumber: '343',
      updateId: 'a1b2c3',
      environment: 'staging',
    });
  });

  it('truncates the OTA id to its first 6 characters', () => {
    setBuild({ updateId: 'd4e5f6aa-0000-4000-8000-000000000000' });
    expect(getAppBuildInfo().updateId).toBe('d4e5f6');
  });

  it('has no update id on the embedded bundle, even though expo-updates reports its manifest id', () => {
    setBuild({ isEmbeddedLaunch: true, updateId: UPDATE_ID });
    expect(getAppBuildInfo().updateId).toBeNull();
  });

  it('has no update id when expo-updates reports none (dev client, updates off)', () => {
    setBuild({ updateId: null });
    expect(getAppBuildInfo().updateId).toBeNull();
  });

  it('treats an empty build number as missing', () => {
    setBuild({ buildNumber: '' });
    expect(getAppBuildInfo().buildNumber).toBeNull();
  });
});

describe('formatAppBuildLabel', () => {
  it('production: version, build number and id, no environment', () => {
    setBuild({ appEnvironment: 'production', version: '1.2.4', buildNumber: '434', updateId: 'd4e5f6aa-0000' });
    expect(label()).toBe('1.2.4 (434) · d4e5f6');
  });

  it('staging: adds "(Staging)"', () => {
    setBuild();
    expect(label()).toBe('1.2.3 (343) · a1b2c3 (Staging)');
  });

  it.each([
    ['the development profile', { appEnvironment: 'development' }],
    ['a build without the variable', { appEnvironment: undefined }],
    ['a __DEV__ bundle (Metro, dev client) targeting staging', { isDev: true }],
    ['a Maestro E2E build', { isE2E: true }],
  ])('development: adds "(Development)" for %s', (_case, over) => {
    setBuild(over);
    expect(label()).toBe('1.2.3 (343) · a1b2c3 (Development)');
  });

  it('shows only the version when the build number is missing', () => {
    setBuild({ appEnvironment: 'production', buildNumber: null });
    expect(label()).toBe('1.2.3 · a1b2c3');
  });

  it('shows the embedded marker instead of an id on the embedded bundle', () => {
    setBuild({ appEnvironment: 'production', isEmbeddedLaunch: true });
    expect(label()).toBe('1.2.3 (343) · embedded');
    expect(label(tr)).toBe('1.2.3 (343) · yerleşik');
  });

  it('is translated: Turkish staging label', () => {
    setBuild({ isEmbeddedLaunch: true });
    expect(label(tr)).toBe('1.2.3 (343) · yerleşik (Staging)');
  });

  it('is null when the version is unknown (the row is hidden)', () => {
    setBuild({ version: undefined });
    expect(label()).toBeNull();
  });
});
