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

  it('staging paket adı TEK kaynaktan: paths.json stagingAndroidPackage (app.config.js\'de ikinci tanım yok)', () => {
    const pathsFile = path.resolve(__dirname, '../../lib/deeplinks/paths.json');
    const real = JSON.parse(fs.readFileSync(pathsFile, 'utf8'));
    let isolated: (ctx: { config: Cfg }) => Cfg = makeConfig;
    jest.isolateModules(() => {
      jest.doMock(pathsFile, () => ({ ...real, stagingAndroidPackage: 'com.example.kaynak.testi' }));
      isolated = require('../../../app.config.js');
    });
    jest.dontMock(pathsFile);
    process.env.EXPO_PUBLIC_ENVIRONMENT = 'preview';
    expect(isolated({ config: base() }).android.package).toBe('com.example.kaynak.testi');
    // gerçek değer: prod paket + ".staging" (iki yerde ayrı ayrı tanımlı değil, tutarlı)
    expect(real.stagingAndroidPackage).toBe(`${real.androidPackage}.staging`);
  });

  it('iOS ile aynı model: iki platformun staging kimliği aynı ek', () => {
    const cfg = withEnv('preview');
    expect(cfg.ios.bundleIdentifier).toBe(cfg.android.package);
  });

  it('app.json (production) değişmedi', () => {
    expect((appJson as any).expo.android.package).toBe('com.tarodan.app');
    expect((appJson as any).expo.android.googleServicesFile).toBe('./google-services.json');
  });

  it('staging ana ekran adı kısa "Staging", production "Tarodan"', () => {
    expect(withEnv('preview').name).toBe('Staging');
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

  describe('dosya staging paketini içermiyorsa (ör. production dosyası)', () => {
    const wrongFile = (env: Record<string, string>, argv: string[]) =>
      resolve({ env, argv, exists: () => true, read: () => fileFor('com.tarodan.app'), packageName: STAGING });

    it.each([
      ['EAS Android build', { EAS_BUILD_PLATFORM: 'android' }, ['node', 'eas']],
      ['expo run:android', {}, ['node', 'expo', 'run:android']],
      ['expo prebuild --platform android', {}, ['node', 'expo', 'prebuild', '--platform', 'android']],
    ])('%s: hata verir', (_n, env, argv) => {
      expect(() => wrongFile(env, argv)).toThrow(/"com\.tarodan\.app\.staging" paketinin istemcisini içermiyor/);
    });

    it.each([
      ['iOS EAS build', { EAS_BUILD_PLATFORM: 'ios' }, ['node', 'eas']],
      ['eas update (OTA)', {}, ['node', 'eas', 'update']],
      ['expo start', {}, ['node', 'expo', 'start']],
      ['expo prebuild --platform ios', {}, ['node', 'expo', 'prebuild', '--platform', 'ios']],
    ])('%s: hata VERMEZ (Android dosyası kullanılmıyor)', (_n, env, argv) => {
      expect(wrongFile(env, argv)).toBe('./google-services.staging.json');
    });
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

describe('isAndroidNativeContext — argüman ayrıştırma', () => {
  const { isAndroidNativeContext: ctx } = makeConfig as unknown as {
    isAndroidNativeContext: (env: Record<string, string>, argv: string[]) => boolean;
  };
  const run = (...args: string[]) => ctx({}, ['node', 'expo', ...args]);

  it.each([
    ['EAS_BUILD_PLATFORM=android', () => ctx({ EAS_BUILD_PLATFORM: 'android' }, ['node', 'eas'])],
    ['run:android', () => run('run:android')],
    ['prebuild (platform yok → all)', () => run('prebuild')],
    ['prebuild --no-install (platform yok; "all" harfleri yanıltmaz)', () => run('prebuild', '--no-install')],
    ['prebuild --clean --no-install', () => run('prebuild', '--clean', '--no-install')],
    ['prebuild --platform android', () => run('prebuild', '--platform', 'android')],
    ['prebuild --platform=android', () => run('prebuild', '--platform=android')],
    ['prebuild -p android', () => run('prebuild', '-p', 'android')],
    ['prebuild -p=android', () => run('prebuild', '-p=android')],
    ['prebuild -pandroid', () => run('prebuild', '-pandroid')],
    ['prebuild --platform all', () => run('prebuild', '--platform', 'all')],
    ['prebuild -p all --no-install', () => run('prebuild', '-p', 'all', '--no-install')],
    ['prebuild --platform ios,android', () => run('prebuild', '--platform', 'ios,android')],
    ['prebuild --platform (değer yok → all)', () => run('prebuild', '--platform')],
    ['prebuild --platform --no-install (değer yok → all)', () => run('prebuild', '--platform', '--no-install')],
    ['prebuild --platform= (boş değer → all)', () => run('prebuild', '--platform=')],
    ['--no-install önce, sonra platform android', () => run('prebuild', '--no-install', '--platform', 'android')],
  ])('Android bağlamı: %s', (_n, fn) => {
    expect(fn()).toBe(true);
  });

  it.each([
    ['env/argv boş', () => ctx({}, ['node', 'expo'])],
    ['EAS_BUILD_PLATFORM=ios', () => ctx({ EAS_BUILD_PLATFORM: 'ios' }, ['node', 'eas'])],
    ['run:ios', () => run('run:ios')],
    ['start', () => run('start')],
    ['eas update (OTA)', () => ctx({}, ['node', 'eas', 'update'])],
    ['prebuild --platform ios', () => run('prebuild', '--platform', 'ios')],
    ['prebuild --platform=ios', () => run('prebuild', '--platform=ios')],
    ['prebuild -p ios', () => run('prebuild', '-p', 'ios')],
    ['prebuild -pios --no-install', () => run('prebuild', '-pios', '--no-install')],
    ['prebuild --no-install --platform ios', () => run('prebuild', '--no-install', '--platform', 'ios')],
    ['prebuild --template android-all-template.tgz --platform ios (değerde "android")', () =>
      run('prebuild', '--template', 'android-all-template.tgz', '--platform', 'ios')],
    ['export --platform android (native değil)', () => run('export', '--platform', 'android')],
  ])('Android bağlamı DEĞİL: %s', (_n, fn) => {
    expect(fn()).toBe(false);
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

  it('yeni paketin keystore\'u: EAS\'te bir kez etkileşimli oluşturulur, CI --non-interactive ile oluşturamaz', () => {
    expect(doc).toMatch(/com\.tarodan\.app\.staging` için EAS'te bir kez ETKİLEŞİMLİ/);
    expect(doc).toContain('--non-interactive');
    expect(doc).toContain('eas credentials -p android');
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
