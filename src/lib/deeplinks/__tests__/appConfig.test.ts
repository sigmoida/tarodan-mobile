/**
 * app.json Android intent filter'i ile yol tablosunun senkronu. app.json elle
 * duzenlenen bir dosya oldugu icin uretilmiyor; bekcisi bu test.
 */
import appJson from '../../../../app.json';
import { buildAndroidPathEntries, deepLinkConfig, productionHosts } from '../index';

// app.json src/ disinda; tsconfig include'u onu kapsamiyorsa
// `const appJson = require('../../../../app.json');` ile oku.

const android = (appJson as any).expo.android;
const filter = android.intentFilters[0];
const data: Array<Record<string, string>> = filter.data;

// Android'in tum yol nitelikleri. `path`/`pathPrefix` disinda `pathPattern` ve
// `pathSuffix` de yol talep eder; ikinci bir filtre eklenirse ödeme bekcisinin
// yanindan gecemesin diye hepsi tek listede tutuluyor.
const PATH_ATTRS = ['path', 'pathPrefix', 'pathPattern', 'pathSuffix'] as const;

describe('app.json — Android App Links', () => {
  it('paket adi tabloyla ayni (tek kaynak)', () => {
    expect(android.package).toBe(deepLinkConfig.androidPackage);
  });

  // Ikinci bir intent filter eklenirse asagidaki kontrollerin hicbiri onu
  // gormez — tek filtre oldugu burada kilitleniyor.
  it('tek bir intent filter var', () => {
    expect(android.intentFilters).toHaveLength(1);
  });

  it('autoVerify acik', () => {
    expect(filter.autoVerify).toBe(true);
  });

  it('scheme bir kez, her PRODUCTION host bir kez bildirilir (staging yok)', () => {
    expect(data.filter((d) => d.scheme).map((d) => d.scheme)).toEqual(['https']);
    expect(data.filter((d) => d.host).map((d) => d.host)).toEqual(productionHosts());
    expect(data.filter((d) => d.host).map((d) => d.host)).toEqual(['tarodan.com.tr']);
  });

  it('yol girdileri tablodan uretilenle birebir ayni', () => {
    const declared = data.filter((d) => PATH_ATTRS.some((attr) => d[attr]));
    expect(declared).toEqual(buildAndroidPathEntries());
  });

  it('odeme ve checkout yollarini TALEP ETMEZ', () => {
    // Her yol-benzeri nitelik uzerinden bak: sonradan eklenen bir pathPattern
    // yalniz path/pathPrefix'e bakan bir kontrolun yanindan gecerdi.
    const claimed = data.flatMap((d) =>
      PATH_ATTRS.map((attr) => d[attr]).filter((v): v is string => typeof v === 'string'),
    );
    for (const forbidden of ['/payment', '/checkout']) {
      expect(claimed.filter((p) => p.includes(forbidden))).toEqual([]);
    }
  });

  it('host genelini talep eden yolsuz bir data girdisi kalmadi', () => {
    // Eski hali: {scheme, host} tek objede, yol kisiti yok → tum host talep edilir
    const hostWithScheme = data.filter((d) => d.scheme && d.host);
    expect(hostWithScheme).toEqual([]);
  });
});

/**
 * iOS Universal Links — `associatedDomains` bir ENTITLEMENT'tır, OTA ile
 * geçmez; app.json elle düzenleniyor, bekçisi bu test.
 *
 * Sıra kuralı (docs/deep-links.md §6): AASA yayına girmeden bu alan eklenirse
 * iOS doğrulama BAŞARISIZLIĞINI önbelleğe alır ve dosya sonradan yayınlansa
 * bile bir süre çalışmaz. 2026-08-11 ölçümünde iki alan adında da AASA 200 ve
 * Apple'ın kendi CDN'i dosyayı görmüş durumda, yani kapı açık.
 */
describe('app.json — iOS Universal Links', () => {
  const ios = (appJson as any).expo.ios;

  it('bundle identifier AASA appID ile ayni', () => {
    expect(deepLinkConfig.appIDs.some((id) => id.endsWith(`.${ios.bundleIdentifier}`))).toBe(true);
  });

  it('her PRODUCTION host icin applinks bildirilir (tek kaynak: paths.json), staging yok', () => {
    expect(ios.associatedDomains).toEqual(productionHosts().map((h) => `applinks:${h}`));
    expect(ios.associatedDomains).toEqual(['applinks:tarodan.com.tr']);
  });
});

/**
 * app.config.js — staging profile. `EXPO_PUBLIC_ENVIRONMENT=preview` (eas.json
 * `preview` and `staging` profiles) swaps the production hosts of app.json for the
 * staging host; development/production keep app.json as it is, apart from the
 * google-signin plugin options (covered in __tests__/app.config.test.ts).
 */
describe('app.config.js — the staging host only in the staging profile', () => {
  const makeConfig = require('../../../../app.config.js') as (ctx: {
    config: Record<string, any>;
  }) => Record<string, any>;
  const base = () => JSON.parse(JSON.stringify((appJson as any).expo));
  const hostsOf = (cfg: Record<string, any>) =>
    (cfg.android.intentFilters[0].data as Array<Record<string, string>>)
      .filter((d) => d.host)
      .map((d) => d.host);
  // EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID is cleared so a developer's shell never changes
  // the result (a malformed id there would make app.config.js throw).
  const keys = ['EXPO_PUBLIC_ENVIRONMENT', 'EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID'] as const;
  const saved = keys.map((k) => [k, process.env[k]] as const);
  beforeEach(() => {
    delete process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  });
  afterEach(() => {
    saved.forEach(([k, v]) => (v === undefined ? delete process.env[k] : (process.env[k] = v)));
  });
  /** Plugins without the google-signin entry, whose options app.config.js sets. */
  const otherPlugins = (plugins: unknown[]) =>
    plugins.filter((p) => (Array.isArray(p) ? p[0] : p) !== '@react-native-google-signin/google-signin');

  it.each(['production', 'development', undefined])(
    '%s: app.json unchanged apart from the google-signin plugin (no staging host)',
    (env) => {
      if (env === undefined) delete process.env.EXPO_PUBLIC_ENVIRONMENT;
      else process.env.EXPO_PUBLIC_ENVIRONMENT = env;
      const cfg = makeConfig({ config: base() });
      const { plugins, ...rest } = cfg;
      const { plugins: basePlugins, ...baseRest } = base();
      expect(rest).toEqual(baseRest);
      expect(otherPlugins(plugins)).toEqual(otherPlugins(basePlugins));
      expect(hostsOf(cfg)).toEqual(['tarodan.com.tr']);
      expect(JSON.stringify(cfg)).not.toContain('staging.tarodan');
    },
  );

  it('preview: Android intent filter YALNIZ staging host\'unu dinler (production host yok)', () => {
    process.env.EXPO_PUBLIC_ENVIRONMENT = 'preview';
    const input = base();
    const cfg = makeConfig({ config: input });
    // Staging ayri paket: production host'unu da dinlerse yan yana kurulumda
    // her link "hangi uygulama?" secicisi cikarir.
    expect(hostsOf(cfg)).toEqual(deepLinkConfig.stagingHosts);
    expect(hostsOf(cfg)).not.toContain('tarodan.com.tr');
    // girdi degismez, yol girdileri ve sirasi korunur
    expect(hostsOf(input)).toEqual(['tarodan.com.tr']);
    const paths = (c: Record<string, any>) =>
      c.android.intentFilters[0].data.filter((d: Record<string, string>) => !d.host);
    expect(paths(cfg)).toEqual(paths(input));
    expect(cfg.android.intentFilters[0].autoVerify).toBe(true);
  });

  it('preview: Android paketi paths.json\'daki staging paketi (production degil)', () => {
    process.env.EXPO_PUBLIC_ENVIRONMENT = 'preview';
    const cfg = makeConfig({ config: base() });
    expect(cfg.android.package).toBe(deepLinkConfig.stagingAndroidPackage);
    expect(cfg.android.package).toBe(`${deepLinkConfig.androidPackage}.staging`);
  });

  it('preview: iOS associatedDomains hic yok (.staging bundle id, AASA talep etmiyor)', () => {
    process.env.EXPO_PUBLIC_ENVIRONMENT = 'preview';
    const cfg = makeConfig({ config: base() });
    expect(cfg.ios.associatedDomains).toBeUndefined();
    expect(cfg.ios.bundleIdentifier).toBe('com.tarodan.app.staging');
  });
});

/**
 * withStagingHosts — yalnız `host` alanı değişir; scheme/path taşıyan data
 * nesneleri silinmez; staging host'u yoksa host'suz autoVerify filtresi kalmaz.
 */
describe('app.config.js — withStagingHosts', () => {
  const { withStagingHosts } = require('../../../../app.config.js') as {
    withStagingHosts: (
      filters?: Array<Record<string, any>>,
      hosts?: string[],
    ) => Array<Record<string, any>>;
  };
  const STG = ['staging.tarodan.com.tr'];
  const filter = (data: Array<Record<string, string>>) => ({
    action: 'VIEW',
    autoVerify: true,
    data,
    category: ['BROWSABLE', 'DEFAULT'],
  });

  it('ayrı { host } nesnesi staging host(lar)ıyla değişir, scheme/path nesneleri aynen kalır', () => {
    const [out] = withStagingHosts(
      [filter([{ scheme: 'https' }, { host: 'tarodan.com.tr' }, { path: '/offers' }])],
      STG,
    );
    expect(out.data).toEqual([{ scheme: 'https' }, { host: STG[0] }, { path: '/offers' }]);
    expect(out.autoVerify).toBe(true);
    expect(out.category).toEqual(['BROWSABLE', 'DEFAULT']);
  });

  it('{ scheme, host } tek nesnesinde scheme KORUNUR, yalnız host değişir', () => {
    const [out] = withStagingHosts([filter([{ scheme: 'https', host: 'tarodan.com.tr' }, { path: '/offers' }])], STG);
    expect(out.data).toEqual([{ scheme: 'https', host: STG[0] }, { path: '/offers' }]);
  });

  it('{ host, path } tek nesnesinde path KORUNUR', () => {
    const [out] = withStagingHosts([filter([{ scheme: 'https' }, { host: 'tarodan.com.tr', pathPrefix: '/listings/' }])], STG);
    expect(out.data).toEqual([{ scheme: 'https' }, { host: STG[0], pathPrefix: '/listings/' }]);
  });

  it('birden çok staging host: saf host nesneleri çoğalır, karma nesne her host için kopyalanır', () => {
    const hosts = ['a.example.com', 'b.example.com'];
    const [out] = withStagingHosts(
      [filter([{ host: 'tarodan.com.tr' }, { scheme: 'https', host: 'tarodan.com.tr' }, { path: '/x' }])],
      hosts,
    );
    expect(out.data).toEqual([
      { host: 'a.example.com' },
      { host: 'b.example.com' },
      { scheme: 'https', host: 'a.example.com' },
      { scheme: 'https', host: 'b.example.com' },
      { path: '/x' },
    ]);
  });

  it('birden çok production host nesnesi staging host\'unu TEKRARLAMAZ', () => {
    const [out] = withStagingHosts([filter([{ host: 'a.com' }, { host: 'b.com' }, { path: '/x' }])], STG);
    expect(out.data).toEqual([{ host: STG[0] }, { path: '/x' }]);
  });

  it('host içermeyen filtreye dokunmaz', () => {
    const f = { action: 'VIEW', data: [{ scheme: 'tarodan' }] };
    expect(withStagingHosts([f], STG)).toEqual([f]);
  });

  it('stagingHosts boşsa host taşıyan filtre düşer (host\'suz autoVerify filtresi kalmaz), host\'suz olan kalır', () => {
    const noHost = { action: 'VIEW', data: [{ scheme: 'tarodan' }] };
    const out = withStagingHosts(
      [filter([{ scheme: 'https' }, { host: 'tarodan.com.tr' }, { path: '/offers' }]), noHost],
      [],
    );
    expect(out).toEqual([noHost]);
    expect(out.some((f) => f.autoVerify && !(f.data ?? []).some((d: any) => d.host))).toBe(false);
  });

  it('girdiyi DEĞİŞTİRMEZ', () => {
    const input = [filter([{ scheme: 'https', host: 'tarodan.com.tr' }])];
    const snapshot = JSON.parse(JSON.stringify(input));
    withStagingHosts(input, STG);
    expect(input).toEqual(snapshot);
  });

  it('varsayılan host\'lar paths.json stagingHosts', () => {
    const [out] = withStagingHosts([filter([{ host: 'tarodan.com.tr' }])]);
    expect(out.data).toEqual(deepLinkConfig.stagingHosts.map((host) => ({ host })));
  });
});
