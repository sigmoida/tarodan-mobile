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
