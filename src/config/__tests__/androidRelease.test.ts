/**
 * Android yayın yapılandırması: iOS'taki iki uygulamalı modelin Android karşılığı.
 *
 * - production: `com.tarodan.app` (Play'de ayrı uygulama)
 * - staging (EAS `preview` + `staging` profilleri): `com.tarodan.app.staging`
 *
 * Adım adım kurulum: docs/ANDROID_RELEASE.md
 */
import appJson from '../../../app.json';
import { deepLinkConfig } from '../../lib/deeplinks';

type Cfg = Record<string, any>;
const makeConfig = require('../../../app.config.js') as (ctx: { config: Cfg }) => Cfg;
const base = (): Cfg => JSON.parse(JSON.stringify((appJson as any).expo));

const ENV_KEYS = ['EXPO_PUBLIC_ENVIRONMENT'] as const;
const saved: Record<string, string | undefined> = {};
beforeEach(() => ENV_KEYS.forEach((k) => (saved[k] = process.env[k])));
afterEach(() =>
  ENV_KEYS.forEach((k) => {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }),
);
const withEnv = (env: string | undefined): Cfg => {
  if (env === undefined) delete process.env.EXPO_PUBLIC_ENVIRONMENT;
  else process.env.EXPO_PUBLIC_ENVIRONMENT = env;
  return makeConfig({ config: base() });
};

describe('Android paket adı — staging .staging alır, production almaz', () => {
  it('preview (staging) paketi com.tarodan.app.staging', () => {
    const cfg = withEnv('preview');
    expect(cfg.android.package).toBe('com.tarodan.app.staging');
    expect(cfg.android.package).toBe(deepLinkConfig.stagingAndroidPackage);
  });

  it.each(['production', 'development', undefined])(
    '%s paketi com.tarodan.app (ek yok)',
    (env) => {
      const pkg = withEnv(env).android.package;
      expect(pkg).toBe('com.tarodan.app');
      expect(pkg).toBe(deepLinkConfig.androidPackage);
      expect(pkg).not.toMatch(/staging/);
    },
  );

  it('iOS ile aynı model: iki platformun staging kimliği aynı ek', () => {
    const cfg = withEnv('preview');
    expect(cfg.ios.bundleIdentifier).toBe(cfg.android.package);
  });

  it('app.json (production) değişmedi', () => {
    expect((appJson as any).expo.android.package).toBe('com.tarodan.app');
    expect((appJson as any).expo.android.googleServicesFile).toBe('./google-services.json');
  });

  it('staging uygulama adı "(Staging)" taşır, production taşımaz', () => {
    expect(withEnv('preview').name).toMatch(/\(Staging\)$/);
    expect(withEnv('production').name).toBe('Tarodan');
  });

  it('versionCode ve diğer Android alanları staging\'de korunur', () => {
    const prod = withEnv('production').android;
    const stg = withEnv('preview').android;
    const { package: _p, intentFilters: _i, googleServicesFile: _g, ...prodRest } = prod;
    const { package: _p2, intentFilters: _i2, googleServicesFile: _g2, ...stgRest } = stg;
    expect(stgRest).toEqual(prodRest);
  });
});
