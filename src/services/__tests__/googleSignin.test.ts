/**
 * B-2.7b · Android'de Google butonu yalnız `EXPO_PUBLIC_GOOGLE_ANDROID_ENABLED==='true'`
 * iken görünsün (SHA-1 kayıtlı değilken DEVELOPER_ERROR). iOS değişmez.
 */
describe('B-2.7b · Google butonu görünürlüğü', () => {
  const env = process.env;

  afterEach(() => {
    process.env = env;
  });

  function load(vars: Record<string, string | undefined>, os: 'ios' | 'android'): boolean {
    process.env = { ...env, ...vars };
    let result = false;
    // isolateModules yeni bir modül kaydı açar: Platform'u o kayıttaki
    // react-native örneğinde ayarla (dıştaki örnek googleSignin'e görünmez).
    jest.isolateModules(() => {
      /* eslint-disable @typescript-eslint/no-var-requires */
      require('react-native').Platform.OS = os;
      result = require('../googleSignin').isGoogleConfigured();
      /* eslint-enable @typescript-eslint/no-var-requires */
    });
    return result;
  }

  it('Android: web client ID olsa bile bayrak yoksa buton gizli', () => {
    expect(
      load({ EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: 'web', EXPO_PUBLIC_GOOGLE_ANDROID_ENABLED: undefined }, 'android'),
    ).toBe(false);
    expect(
      load({ EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: 'web', EXPO_PUBLIC_GOOGLE_ANDROID_ENABLED: '1' }, 'android'),
    ).toBe(false);
  });

  it("Android: bayrak 'true' ve web client ID varsa görünür", () => {
    expect(
      load({ EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: 'web', EXPO_PUBLIC_GOOGLE_ANDROID_ENABLED: 'true' }, 'android'),
    ).toBe(true);
    expect(
      load({ EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: undefined, EXPO_PUBLIC_GOOGLE_ANDROID_ENABLED: 'true' }, 'android'),
    ).toBe(false);
  });

  it('iOS değişmez: yalnız iOS client ID belirler, Android bayrağı etkisiz', () => {
    expect(
      load({ EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: 'ios', EXPO_PUBLIC_GOOGLE_ANDROID_ENABLED: undefined }, 'ios'),
    ).toBe(true);
    expect(
      load({ EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: undefined, EXPO_PUBLIC_GOOGLE_ANDROID_ENABLED: 'true' }, 'ios'),
    ).toBe(false);
  });

  it('bayrak .env.example içinde gerekçesiyle belgeli, varsayılanı kapalı', () => {
    /* eslint-disable @typescript-eslint/no-var-requires */
    const fs = require('fs');
    const path = require('path');
    /* eslint-enable @typescript-eslint/no-var-requires */
    const example: string = fs.readFileSync(
      path.join(__dirname, '../../../.env.example'),
      'utf8',
    );
    expect(example).toMatch(/^EXPO_PUBLIC_GOOGLE_ANDROID_ENABLED=false$/m);
    expect(example).toContain('DEVELOPER_ERROR');
  });
});

describe('signInWithGoogle: step-up freshness and cancel (sign-in methods delta 2026-10-21)', () => {
  const env = process.env;
  afterEach(() => {
    process.env = env;
  });

  /** Loads the service on iOS with a client id, against the global SDK mock (jest.setup). */
  function load() {
    process.env = { ...env, EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: 'ios' };
    let service: typeof import('../googleSignin') | undefined;
    jest.isolateModules(() => {
      /* eslint-disable @typescript-eslint/no-var-requires */
      require('react-native').Platform.OS = 'ios';
      service = require('../googleSignin');
      /* eslint-enable @typescript-eslint/no-var-requires */
    });
    // The service requires the SDK lazily at call time, from the outer module registry.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const sdk: { signIn: jest.Mock; signOut: jest.Mock } = require('@react-native-google-signin/google-signin').GoogleSignin;
    sdk.signIn.mockClear();
    sdk.signOut.mockClear();
    return { service: service!, sdk };
  }

  it('fresh: signs the SDK out BEFORE signing in, so the chooser shows and the idToken is new', async () => {
    const { service, sdk } = load();
    sdk.signIn.mockResolvedValueOnce({ type: 'success', data: { idToken: 'fresh-id' } });
    await expect(service.signInWithGoogle({ fresh: true })).resolves.toBe('fresh-id');
    expect(sdk.signOut).toHaveBeenCalledTimes(1);
    expect(sdk.signOut.mock.invocationCallOrder[0]).toBeLessThan(sdk.signIn.mock.invocationCallOrder[0]!);
  });

  it('login keeps the SDK session (no sign-out)', async () => {
    const { service, sdk } = load();
    sdk.signIn.mockResolvedValueOnce({ type: 'success', data: { idToken: 'id' } });
    await service.signInWithGoogle();
    expect(sdk.signOut).not.toHaveBeenCalled();
  });

  it("the SDK's `{ type: 'cancelled' }` answer becomes the silent cancel code", async () => {
    const { service, sdk } = load();
    sdk.signIn.mockResolvedValueOnce({ type: 'cancelled', data: null });
    await expect(service.signInWithGoogle({ fresh: true })).rejects.toMatchObject({ code: 'SIGN_IN_CANCELLED' });
    const { isGoogleCancel } = jest.requireActual('../googleSigninErrors');
    expect(isGoogleCancel({ code: 'SIGN_IN_CANCELLED' })).toBe(true);
    expect(isGoogleCancel({ code: '-5' })).toBe(true);
    expect(isGoogleCancel({ code: '10' })).toBe(false);
  });
});
