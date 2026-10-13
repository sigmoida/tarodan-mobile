/**
 * Android yayın yapılandırması: iOS'taki iki uygulamalı modelin Android karşılığı.
 *
 * - production: `com.tarodan.app` (Play'de ayrı uygulama)
 * - staging (EAS `preview` + `staging` profilleri): `com.tarodan.app.staging`
 *
 * Adım adım kurulum: docs/ANDROID_RELEASE.md
 */
import * as fs from 'fs';
import * as path from 'path';
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

describe('staging android.googleServicesFile seçimi', () => {
  const { resolveStagingGoogleServicesFile: resolve } = makeConfig as unknown as {
    resolveStagingGoogleServicesFile: (o?: Record<string, unknown>) => string;
  };
  const STAGING = 'com.tarodan.app.staging';
  const fileFor = (...pkgs: string[]) =>
    JSON.stringify({
      client: pkgs.map((p) => ({ client_info: { android_client_info: { package_name: p } } })),
    });
  const ENV_VAR = 'GOOGLE_SERVICES_JSON_STAGING';

  it('production ve development production dosyasında kalır', () => {
    expect(withEnv('production').android.googleServicesFile).toBe('./google-services.json');
    expect(withEnv('development').android.googleServicesFile).toBe('./google-services.json');
  });

  it('repo dosyası VARSAYILAN: env değişkeni de varken repo dosyası kazanır (fingerprint tutarlılığı)', () => {
    // OTA job'unda env yok, EAS build'inde var: ikisi de aynı dosyayı görmeli.
    const file = resolve({
      env: { [ENV_VAR]: '/eas/tmp/gs.json' },
      exists: () => true,
      read: () => fileFor(STAGING),
      packageName: STAGING,
    });
    expect(file).toBe('./google-services.staging.json');
  });

  it('repo dosyası yoksa EAS file env değişkeni yedek olarak kullanılır', () => {
    const file = resolve({
      env: { [ENV_VAR]: '/eas/tmp/gs.json' },
      exists: (p: string) => p === '/eas/tmp/gs.json',
      read: () => fileFor(STAGING),
      packageName: STAGING,
    });
    expect(file).toBe('/eas/tmp/gs.json');
  });

  it('env yoksa repo kökündeki google-services.staging.json', () => {
    const file = resolve({
      env: {},
      exists: (p: string) => p.endsWith('google-services.staging.json'),
      read: () => fileFor('com.tarodan.app', STAGING),
      packageName: STAGING,
    });
    expect(file).toBe('./google-services.staging.json');
  });

  it('boş/boşluklu env değişkeni "yok" sayılır', () => {
    expect(
      resolve({ env: { [ENV_VAR]: '  ' }, exists: () => true, read: () => fileFor(STAGING), packageName: STAGING }),
    ).toBe('./google-services.staging.json');
  });

  it('hiçbiri yokken Android build bağlamında AÇIK HATA verir, prod dosyasına düşmez', () => {
    const run = () =>
      resolve({
        env: { EAS_BUILD_PLATFORM: 'android' },
        argv: ['node', 'eas'],
        exists: () => false,
        packageName: STAGING,
      });
    expect(run).toThrow(/GOOGLE_SERVICES_JSON_STAGING/);
    expect(run).toThrow(/google-services\.staging\.json/);
    expect(run).toThrow(/com\.tarodan\.app\.staging/);
  });

  it.each([
    ['expo run:android', ['node', 'expo', 'run:android']],
    ['expo prebuild --platform android', ['node', 'expo', 'prebuild', '--platform', 'android']],
  ])('%s de hata verir', (_name, argv) => {
    expect(() => resolve({ env: {}, argv, exists: () => false, packageName: STAGING })).toThrow(
      /google-services\.json bulunamadı/,
    );
  });

  it.each([
    ['iOS EAS build', { EAS_BUILD_PLATFORM: 'ios' }, ['node', 'eas']],
    ['OTA / yerel config', {}, ['node', 'eas', 'update']],
  ])('%s: dosya yoksa hata VERMEZ (Android dosyası kullanılmaz), prod dosyasına da düşmez', (_n, env, argv) => {
    const file = resolve({ env, argv, exists: () => false, packageName: STAGING });
    expect(file).toBe('./google-services.staging.json');
    expect(file).not.toBe('./google-services.json');
  });

  it('dosya staging paketini içermiyorsa (ör. production dosyası) hata verir', () => {
    expect(() =>
      resolve({
        env: {},
        exists: () => true,
        read: () => fileFor('com.tarodan.app'),
        packageName: STAGING,
      }),
    ).toThrow(/"com\.tarodan\.app\.staging" paketinin istemcisini içermiyor/);
  });

  it('bozuk JSON Gradle\'a bırakılır (burada çökmez)', () => {
    expect(
      resolve({ env: {}, exists: () => true, read: () => '{', packageName: STAGING }),
    ).toBe('./google-services.staging.json');
  });

  it('preview config\'inde android.googleServicesFile repo dosyasıdır; env değişkeni (varsa) onu değiştirmez', () => {
    const prev = process.env[ENV_VAR];
    try {
      delete process.env[ENV_VAR];
      expect(withEnv('preview').android.googleServicesFile).toBe('./google-services.staging.json');
      process.env[ENV_VAR] = '/eas/tmp/farkli-yol.json';
      expect(withEnv('preview').android.googleServicesFile).toBe('./google-services.staging.json');
    } finally {
      if (prev === undefined) delete process.env[ENV_VAR];
      else process.env[ENV_VAR] = prev;
    }
  });

  it('repodaki google-services.staging.json staging projesi + staging paketi (production değil)', () => {
    const json = JSON.parse(
      fs.readFileSync(path.resolve(__dirname, '../../../google-services.staging.json'), 'utf8'),
    );
    expect(json.project_info.project_id).toBe('tarodan-staging');
    const pkgs = json.client.map((c: any) => c.client_info.android_client_info.package_name);
    expect(pkgs).toEqual([deepLinkConfig.stagingAndroidPackage]);
    expect(pkgs).not.toContain(deepLinkConfig.androidPackage);
  });

  it('production dosyası staging projesine ait değil (iki dosya karışmadı)', () => {
    const json = JSON.parse(
      fs.readFileSync(path.resolve(__dirname, '../../../google-services.json'), 'utf8'),
    );
    expect(json.project_info.project_id).toBe('tarodan-c1290');
  });

  it('repoda google-services.json hâlâ yalnız production paketini içerir', () => {
    const json = JSON.parse(
      fs.readFileSync(path.resolve(__dirname, '../../../google-services.json'), 'utf8'),
    );
    const pkgs = json.client.map((c: any) => c.client_info.android_client_info.package_name);
    expect(pkgs).toContain('com.tarodan.app');
    expect(pkgs).not.toContain(STAGING);
  });
});

describe('eas.json — Android build ve submit profilleri', () => {
  type AndroidBuild = { buildType?: string; autoIncrement?: string | boolean };
  type Eas = {
    build: Record<string, { distribution?: string; channel?: string; environment?: string; android?: AndroidBuild; env?: Record<string, string> }>;
    submit: Record<string, { android?: Record<string, unknown>; ios?: Record<string, unknown> }>;
  };
  const eas = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../../eas.json'), 'utf8')) as Eas;

  it('staging: Play için AAB, versionCode otomatik artar, store dağıtımı', () => {
    expect(eas.build.staging!.distribution).toBe('store');
    expect(eas.build.staging!.android).toEqual({ buildType: 'app-bundle', autoIncrement: 'versionCode' });
  });

  it('staging, preview ortamını kullanır (app.config.js .staging paketini seçsin)', () => {
    expect(eas.build.staging!.env!.EXPO_PUBLIC_ENVIRONMENT).toBe('preview');
    expect(eas.build.staging!.channel).toBe('staging');
  });

  it('staging profili EAS `environment` anahtarı TAŞIMAZ (iOS staging\'in EAS değişkenleri değişmesin)', () => {
    // `environment: preview` eklemek iOS staging build'lerinin aldığı EAS
    // değişkenlerini (Sentry DSN vb.) production'dan preview'a çevirirdi.
    // Android dosyası artık repoda (google-services.staging.json) olduğundan gerekmiyor.
    expect(eas.build.staging).not.toHaveProperty('environment');
    expect(eas.build.preview).not.toHaveProperty('environment');
  });

  it('production: AAB, store dağıtımı, versionCode otomatik artar', () => {
    expect(eas.build.production!.distribution).toBe('store');
    expect(eas.build.production!.android).toEqual({ buildType: 'app-bundle', autoIncrement: 'versionCode' });
  });

  it('preview ad-hoc APK kalır (internal dağıtım) ve staging paketini üretir', () => {
    expect(eas.build.preview!.distribution).toBe('internal');
    expect(eas.build.preview!.android!.buildType).toBe('apk');
    // paket adını EXPO_PUBLIC_ENVIRONMENT=preview belirler → .staging
    expect(eas.build.preview!.env!.EXPO_PUBLIC_ENVIRONMENT).toBe('preview');
    expect(withEnv(eas.build.preview!.env!.EXPO_PUBLIC_ENVIRONMENT).android.package).toBe(
      'com.tarodan.app.staging',
    );
  });

  it('submit.staging.android: internal track, completed (inceleme gerektirmez)', () => {
    expect(eas.submit.staging!.android).toEqual({ track: 'internal', releaseStatus: 'completed' });
  });

  it('submit.production.android: internal track (closed/production Play Console\'dan terfi)', () => {
    expect(eas.submit.production!.android).toEqual({ track: 'internal' });
  });

  it.each(['staging', 'production'])(
    'submit.%s.android: servis hesabı anahtarı repoda YOK (EAS credentials\'ta)',
    (name) => {
      const android = eas.submit[name]!.android!;
      expect(android).not.toHaveProperty('serviceAccountKeyPath');
      expect(JSON.stringify(android)).not.toMatch(/\.json/);
    },
  );

  it('iOS submit profilleri etkilenmedi', () => {
    expect(eas.submit.staging!.ios!.ascAppId).toBe('6794634529');
    expect(eas.submit.production!.ios!.ascAppId).toBe('6786614139');
  });
});

describe('docs/ANDROID_RELEASE.md', () => {
  const root = path.resolve(__dirname, '../../..');
  const doc = fs.readFileSync(path.join(root, 'docs/ANDROID_RELEASE.md'), 'utf8');

  it.each([
    'com.tarodan.app.staging',
    'tarodan-staging',
    'tarodan-c1290',
    '243308404313',
    'GOOGLE_SERVICES_JSON_STAGING',
    'ANDROID_RELEASE_ENABLED',
    'EXPO_PUBLIC_GOOGLE_ANDROID_ENABLED',
    'FCM V1',
    '12 testçi',
    'Play App Signing',
    'assetlinks.staging.json',
    'Data Safety',
    'hesap silme',
  ])('"%s" anlatılıyor', (needle) => {
    expect(doc).toContain(needle);
  });

  it('SECRETS_SETUP.md ve RELEASE.md kılavuza bağlanıyor', () => {
    expect(fs.readFileSync(path.join(root, 'SECRETS_SETUP.md'), 'utf8')).toContain('docs/ANDROID_RELEASE.md');
    expect(fs.readFileSync(path.join(root, 'docs/RELEASE.md'), 'utf8')).toContain('ANDROID_RELEASE.md');
  });

  it('eski "Android paketi değişmez" iddiası kalmadı', () => {
    for (const f of ['SECRETS_SETUP.md', 'docs/RELEASE.md']) {
      const text = fs.readFileSync(path.join(root, f), 'utf8');
      expect(text).not.toMatch(/Android paket adına `\.staging` eki EKLENMEZ/);
      expect(text).not.toMatch(/On \*\*Android\*\* the package stays/);
    }
  });
});
