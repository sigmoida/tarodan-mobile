/**
 * app.json Android intent filter'i ile yol tablosunun senkronu. app.json elle
 * duzenlenen bir dosya oldugu icin uretilmiyor; bekcisi bu test.
 */
import appJson from '../../../../app.json';
import { buildAndroidPathEntries, deepLinkConfig } from '../index';

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

  it('scheme bir kez, her host bir kez bildirilir', () => {
    expect(data.filter((d) => d.scheme).map((d) => d.scheme)).toEqual(['https']);
    expect(data.filter((d) => d.host).map((d) => d.host)).toEqual(deepLinkConfig.hosts);
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

  it('her host icin applinks bildirilir (tek kaynak: paths.json)', () => {
    expect(ios.associatedDomains).toEqual(deepLinkConfig.hosts.map((h) => `applinks:${h}`));
  });
});
