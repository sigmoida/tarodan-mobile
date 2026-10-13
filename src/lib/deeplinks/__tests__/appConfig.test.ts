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
 * app.config.js — staging profili. `EXPO_PUBLIC_ENVIRONMENT=preview` (eas.json
 * `preview` ve `staging` profilleri) production app.json'ı staging host'uyla
 * genişletir; development/production app.json'ı olduğu gibi döner.
 */
describe('app.config.js — staging alan adi yalniz staging profilinde', () => {
  const makeConfig = require('../../../../app.config.js') as (ctx: {
    config: Record<string, any>;
  }) => Record<string, any>;
  const base = () => JSON.parse(JSON.stringify((appJson as any).expo));
  const hostsOf = (cfg: Record<string, any>) =>
    (cfg.android.intentFilters[0].data as Array<Record<string, string>>)
      .filter((d) => d.host)
      .map((d) => d.host);
  const saved = process.env.EXPO_PUBLIC_ENVIRONMENT;
  afterEach(() => {
    if (saved === undefined) delete process.env.EXPO_PUBLIC_ENVIRONMENT;
    else process.env.EXPO_PUBLIC_ENVIRONMENT = saved;
  });

  it.each(['production', 'development', undefined])(
    '%s: app.json aynen doner (staging host yok)',
    (env) => {
      if (env === undefined) delete process.env.EXPO_PUBLIC_ENVIRONMENT;
      else process.env.EXPO_PUBLIC_ENVIRONMENT = env;
      const cfg = makeConfig({ config: base() });
      expect(cfg).toEqual(base());
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
