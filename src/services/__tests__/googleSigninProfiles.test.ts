/**
 * Google sign-in per eas.json build profile, end to end in JS: the env a profile builds
 * with (its `extends` chain merged, as EAS resolves it) goes through the real
 * `googleSignin.ts`, `socialProviders.ts` and `app.config.js`, not through mocks.
 *
 * The other suites pin each piece on its own (easProfiles: the values; app.config: the
 * scheme; googleSignin: the flag logic with synthetic env; login-no-social and reauth:
 * the screens with `isGoogleConfigured` mocked). This one pins the links between them:
 *
 * - the iOS client id the app hands to `GoogleSignin.configure` reverses into exactly the
 *   URL scheme app.config.js registers for that profile (a mismatch crashes the tap);
 * - the button shows on iOS in every profile, and on Android only in the staging-package
 *   profiles whose Android OAuth clients exist (`preview`, `staging`);
 * - a Google-only account can pass the step-up on Android staging, and falls back to the
 *   set-password mail on Android production while the flag is off (ADR 0012).
 */
import * as fs from 'fs';
import * as path from 'path';

type Profile = { extends?: string; env?: Record<string, string> };
const eas = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../../eas.json'), 'utf8')) as {
  build: Record<string, Profile>;
};
// eslint-disable-next-line @typescript-eslint/no-var-requires
const appConfig = require('../../../app.config.js');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { expo: baseConfig } = require('../../../app.json');

const PLUGIN = '@react-native-google-signin/google-signin';
const GOOGLE_KEYS = [
  'EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID',
  'EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID',
  'EXPO_PUBLIC_GOOGLE_ANDROID_ENABLED',
] as const;

const resolvedEnv = (name: string): Record<string, string> => {
  const profile = eas.build[name]!;
  return { ...(profile.extends ? resolvedEnv(profile.extends) : {}), ...(profile.env ?? {}) };
};

/** Profiles whose binary shows Google on Android (staging package, clients exist). */
const ANDROID_ON: Record<string, boolean> = {
  development: false,
  preview: true,
  staging: true,
  maestro: false,
  production: false,
};

type Loaded = {
  service: typeof import('../googleSignin');
  social: typeof import('@/components/auth/socialProviders');
};

// Two details of the jest-expo transform shape the helpers below:
// - `process.env.EXPO_PUBLIC_*` becomes a read of `expo/virtual/env`, which captures the
//   `process.env` object when it is first loaded. A module loaded in `isolateModules` gets a
//   fresh copy (it sees a replaced `process.env`); app.config.js, loaded once at the top,
//   sees only the original object, so its env is set on that object, in place.
// - Imports are lazy: after `isolateModules` returns, the service reaches `react-native`
//   (and the SDK) through the outer registry, so `Platform.OS` is set there too.
const savedEnv = process.env;
// eslint-disable-next-line @typescript-eslint/no-var-requires
const outerPlatform = require('react-native').Platform as { OS: string };
const savedOS = outerPlatform.OS;
afterEach(() => {
  process.env = savedEnv;
  outerPlatform.OS = savedOS;
});

/**
 * Loads the service and the provider helpers as a binary of `profile` on `os` would: only
 * the profile's Google env is visible (a developer's shell never leaks in).
 */
function load(profile: string, os: 'ios' | 'android'): Loaded {
  const env = { ...savedEnv };
  GOOGLE_KEYS.forEach((k) => delete env[k]);
  process.env = { ...env, ...resolvedEnv(profile) };
  outerPlatform.OS = os;
  let loaded: Loaded | undefined;
  jest.isolateModules(() => {
    /* eslint-disable @typescript-eslint/no-var-requires */
    require('react-native').Platform.OS = os;
    loaded = { service: require('../googleSignin'), social: require('@/components/auth/socialProviders') };
    /* eslint-enable @typescript-eslint/no-var-requires */
  });
  return loaded!;
}

/** The SDK mock of jest.setup, as the service reaches it lazily at call time. */
function sdk() {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require('@react-native-google-signin/google-signin').GoogleSignin as {
    configure: jest.Mock;
    signIn: jest.Mock;
  };
}

/** The iosUrlScheme app.config.js gives the google-signin plugin under the profile env. */
const iosUrlSchemeOf = (env: Record<string, string>) => {
  const current = process.env;
  process.env = savedEnv;
  const keys = [...new Set([...GOOGLE_KEYS, ...Object.keys(env)])];
  const before = keys.map((k) => [k, savedEnv[k]] as const);
  keys.forEach((k) => (env[k] === undefined ? delete savedEnv[k] : (savedEnv[k] = env[k])));
  try {
    const plugins = appConfig({ config: baseConfig }).plugins as unknown[];
    const entry = plugins.find((p) => Array.isArray(p) && p[0] === PLUGIN) as [string, { iosUrlScheme?: string }];
    return entry?.[1]?.iosUrlScheme;
  } finally {
    before.forEach(([k, v]) => (v === undefined ? delete savedEnv[k] : (savedEnv[k] = v)));
    process.env = current;
  }
};

const profiles = Object.keys(eas.build);

it('covers every eas.json build profile', () => {
  expect(profiles.sort()).toEqual(Object.keys(ANDROID_ON).sort());
});

describe.each(profiles)('profile %s', (profile) => {
  const env = resolvedEnv(profile);

  it('iOS: the client id passed to configure is the one whose reversed scheme app.config.js registers', async () => {
    const { service } = load(profile, 'ios');
    expect(service.isGoogleConfigured()).toBe(true);
    const google = sdk();
    google.configure.mockClear();
    google.signIn.mockResolvedValueOnce({ type: 'success', data: { idToken: 'id' } });
    await service.signInWithGoogle();

    expect(google.configure).toHaveBeenCalledTimes(1);
    const options = google.configure.mock.calls[0]![0] as { webClientId?: string; iosClientId?: string };
    // The token audience is the web client of project tarodan-app on every profile.
    expect(options.webClientId).toBe(env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID);
    expect(options.iosClientId).toBe(env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID);
    const [prefix] = options.iosClientId!.split('.apps.googleusercontent.com');
    expect(iosUrlSchemeOf(env)).toBe(`com.googleusercontent.apps.${prefix}`);
  });

  it(`Android: the Google button ${ANDROID_ON[profile] ? 'shows' : 'stays hidden'}`, () => {
    const { service, social } = load(profile, 'android');
    expect(service.isGoogleConfigured()).toBe(ANDROID_ON[profile]);
    // Apple is iOS-only (ADR 0012): with Google off, Android has no provider at all, so the
    // login form drops the "or" divider (`any`).
    expect(social.getVisibleSocialProviders({ appleAvailable: false })).toEqual({
      google: ANDROID_ON[profile],
      apple: false,
      any: ANDROID_ON[profile],
    });
  });

  it(`Android: a Google-only account ${ANDROID_ON[profile] ? 'confirms with Google' : 'cannot confirm here (set-password mail)'}`, () => {
    const { social } = load(profile, 'android');
    const googleOnly = {
      hasPassword: false,
      providers: [{ provider: 'google' as const, email: null, linkedAt: '2026-10-01T00:00:00.000Z' }],
    };
    const visible = social.getVisibleSocialProviders({ appleAvailable: false });
    expect(social.confirmableProviders(googleOnly, visible)).toEqual(ANDROID_ON[profile] ? ['google'] : []);
    expect(social.canConfirmOnDevice(googleOnly, visible)).toBe(ANDROID_ON[profile]);
  });
});

it('Android with the flag off: signInWithGoogle refuses before touching the SDK', async () => {
  const { service } = load('production', 'android');
  const google = sdk();
  google.configure.mockClear();
  google.signIn.mockClear();
  await expect(service.signInWithGoogle()).rejects.toThrow();
  expect(google.configure).not.toHaveBeenCalled();
  expect(google.signIn).not.toHaveBeenCalled();
});
