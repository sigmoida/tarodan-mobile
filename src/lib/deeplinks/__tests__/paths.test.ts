/**
 * Web yol tablosu ile toMobileRoute arasindaki senkron. Bu tablo AASA ve
 * assetlinks.json'un TEK kaynagi; elle yazilan ikinci bir liste yok.
 */
import { toMobileRoute } from '@/utils/notificationRoute';
import {
  deepLinkConfig,
  shippablePaths,
  pendingConfirmation,
  withLocaleVariants,
  stripLocalePrefix,
  toAndroidPathEntry,
  pathFromUrl,
  isExcludedWebPath,
} from '../index';

const shipped = shippablePaths();
const included = shipped.filter((p) => p.include);
const excluded = shipped.filter((p) => !p.include);

describe('paths.json — cozucu senkronu', () => {
  it('yayinlanacak en az bir yol var', () => {
    expect(included.length).toBeGreaterThan(0);
  });

  it.each(included.map((p) => [p.pattern, p.sample]))(
    'teyitli %s ornegi (%s) bir mobil rotaya cozulur',
    (_pattern, sample) => {
      expect(toMobileRoute(sample)).not.toBeNull();
    },
  );

  it.each(excluded.map((p) => [p.pattern, p.sample]))(
    'dislanan %s ornegi (%s) cozulmez',
    (_pattern, sample) => {
      expect(toMobileRoute(sample)).toBeNull();
    },
  );

  it('teyit bekleyen satirlar tabloda durur (sessizce silinmez)', () => {
    expect(pendingConfirmation().length).toBeGreaterThan(0);
  });

  it.each(
    included.flatMap((p) =>
      deepLinkConfig.locales.map((l) => [l, p.pattern, `/${l}${p.sample}`] as const),
    ),
  )('%s onekli %s ornegi (%s) de cozulur', (_locale, _pattern, sample) => {
    expect(toMobileRoute(sample)).not.toBeNull();
  });
});

describe('paths.json — regresyon kilidi', () => {
  // Eski docs/ios-universal-links.md listesi MOBIL rota adlariyla yazilmisti.
  // Bunlar web URL'si degil; yayinlansaydi Apple dosyayi kabul eder, linkler
  // yine Safari'de acilirdi. Tabloya geri sizmalarini engelle.
  const MOBILE_ONLY = [
    '/order-track',
    '/corporate-invite',
    '/trade/5',
    '/product/123',
  ];

  it.each(MOBILE_ONLY)('%s bir WEB yolu degil, tabloda yer almaz', (sample) => {
    const patterns = deepLinkConfig.paths.map((p) => p.pattern);
    const head = `/${sample.split('/').filter(Boolean)[0]}`;
    expect(patterns).not.toContain(head);
    expect(patterns).not.toContain(`${head}/*`);
    expect(patterns).not.toContain(`${head}*`);
  });
});

describe('locale varyantlari', () => {
  // Web next-intl'i `localePrefix: "as-needed"` kullaniyor: varsayilan dil (tr)
  // ON EKSIZ render ediliyor, yani /tr/listings/123 kanonik bir URL degil ve
  // yayinda talep edilmemeli. /en/... ise gercek bir URL.
  it('ciplak + varsayilan OLMAYAN locale onekli varyanti uretir', () => {
    expect(withLocaleVariants('/listings/*')).toEqual([
      '/listings/*',
      '/en/listings/*',
    ]);
  });

  it('varsayilan locale onekini yayina koymaz', () => {
    expect(withLocaleVariants('/listings/*')).not.toContain('/tr/listings/*');
  });

  // Yayinlamak ile anlamak ayri sorular: kanonik olmayan /tr/... bicimi
  // (eski baglantilar, elle yazilmis URL'ler) yine cozulebilmeli.
  it('kanonik olmayan /tr/ onekini yine de soyar', () => {
    expect(stripLocalePrefix('/tr/listings/123')).toBe('/listings/123');
    expect(stripLocalePrefix('/en/listings/123')).toBe('/listings/123');
    expect(stripLocalePrefix('/listings/123')).toBe('/listings/123');
  });

  it('locale olmayan ilk segmenti soymaz', () => {
    expect(stripLocalePrefix('/trades/5')).toBe('/trades/5');
  });
});

// Silinen src/services/__tests__/deepLinks.test.ts'ten devralindi (fonksiyon
// oraya degil buraya tasindi; cagirani app/+native-intent.ts).
describe('pathFromUrl', () => {
  it('https universal linkten yol + sorguyu cikarir', () => {
    expect(pathFromUrl('https://tarodan.com.tr/verify-email?token=abc')).toBe(
      '/verify-email?token=abc',
    );
  });

  it('custom scheme baglantisindan yol cikarir', () => {
    expect(pathFromUrl('tarodan://product/p-1')).toBe('/product/p-1');
  });

  it('semasiz girdiyi zaten yol kabul eder (bas slash ekler)', () => {
    expect(pathFromUrl('product/p-1')).toBe('/product/p-1');
    expect(pathFromUrl('/product/p-1')).toBe('/product/p-1');
  });

  it('ardisik slaslari tekile indirir', () => {
    expect(pathFromUrl('https://tarodan.com.tr//product/p-1')).toBe('/product/p-1');
  });

  it('yol yoksa null doner', () => {
    expect(pathFromUrl('https://tarodan.com.tr')).toBeNull();
    expect(pathFromUrl('tarodan:///')).toBeNull();
    expect(pathFromUrl('')).toBeNull();
  });
});

describe('isExcludedWebPath', () => {
  // Her include:false satirin kendi ornegi, ciplak + locale onekli halleriyle.
  it.each(
    excluded.flatMap((p) =>
      [p.sample, ...deepLinkConfig.locales.map((l) => `/${l}${p.sample}`)].map(
        (sample) => [p.pattern, sample] as const,
      ),
    ),
  )('%s deseni %s yolunu dislar', (_pattern, sample) => {
    expect(isExcludedWebPath(sample)).toBe(true);
  });

  it('dislanan yolun sorgulu hali de dislanir', () => {
    expect(isExcludedWebPath('/payment/success?paymentId=p1')).toBe(true);
    expect(isExcludedWebPath('/tr/payment/fail')).toBe(true);
  });

  it('yayinlanan yollari dislamaz', () => {
    for (const p of shippablePaths().filter((row) => row.include)) {
      expect(isExcludedWebPath(p.sample)).toBe(false);
    }
  });
});

describe('Android yol girdisi donusumu', () => {
  it('* ile biten deseni pathPrefix yapar', () => {
    expect(toAndroidPathEntry('/listings/*')).toEqual({ pathPrefix: '/listings/' });
  });

  it('* olmayan deseni path yapar', () => {
    expect(toAndroidPathEntry('/track-order')).toEqual({ path: '/track-order' });
  });
});

describe('tablo sabitleri', () => {
  it('appIDs Team ID + bundle birlesimidir', () => {
    expect(deepLinkConfig.appIDs).toEqual(['P2628CQK26.com.tarodan.app']);
  });

  it('her iki alan adi da sayilir', () => {
    expect(deepLinkConfig.hosts).toEqual(['tarodan.com.tr', 'staging.tarodan.com.tr']);
  });
});

describe('uretilen AASA dosyasi', () => {
  const fs = require('fs');
  const path = require('path');
  const FILE = path.join(
    __dirname,
    '../../../../docs/wellknown/apple-app-site-association',
  );
  const aasa = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  const detail = aasa.applinks.details[0];
  const components: Array<{ '/': string; exclude?: boolean }> = detail.components;
  const patterns = components.map((c) => c['/']);

  it('appIDs Team ID + bundle birlesimidir', () => {
    expect(detail.appIDs).toEqual(deepLinkConfig.appIDs);
  });

  // Tabloya satir eklenip `pnpm wellknown:gen` kosulmazsa bu test kirmizi olur.
  it.each(
    shippablePaths().flatMap((p) =>
      withLocaleVariants(p.pattern).map((v) => [p.pattern, v] as const),
    ),
  )('%s icin %s varyanti dosyada var', (_pattern, variant) => {
    expect(patterns).toContain(variant);
  });

  // Ciplak desen kadar locale varyantlari da sizabilir: `/seller/*` silinip
  // `/tr/seller/*` dosyada kalirsa bunu YALNIZ varyant uzerinden gezen bu
  // kontrol yakalar.
  it.each(
    pendingConfirmation().flatMap((p) =>
      withLocaleVariants(p.pattern).map((v) => [p.pattern, v] as const),
    ),
  )('teyit bekleyen %s icin %s varyanti dosyada yok', (_pattern, variant) => {
    expect(patterns).not.toContain(variant);
  });

  // Ters yon: dosyadaki her desen tabloda bir satira karsilik gelmeli. Bu
  // olmadan `paths.json`'dan teyitli bir satir silinip `wellknown:gen`
  // kosulmadiginda, uygulamanin ele alamadigi bir yol icin CANLI talep
  // dosyada kalir ve hicbir test kirmizi olmaz.
  it('dosyadaki her desen tabloda bir satirdan geliyor (fazlalik yok)', () => {
    const fromTable = new Set(
      shippablePaths().flatMap((p) => withLocaleVariants(p.pattern)),
    );
    expect(patterns.filter((p) => !fromTable.has(p))).toEqual([]);
  });

  it('dislamalar listenin basinda (AASA v2: ilk eslesen kazanir)', () => {
    const firstInclude = components.findIndex((c) => c.exclude !== true);
    const lastExclude = components.map((c) => c.exclude === true).lastIndexOf(true);
    expect(lastExclude).toBeLessThan(firstInclude);
  });

  it('dislanan her yol exclude bayragiyla isaretli', () => {
    const excludedPatterns = shippablePaths()
      .filter((p) => !p.include)
      .flatMap((p) => withLocaleVariants(p.pattern));
    for (const pattern of excludedPatterns) {
      expect(components.find((c) => c['/'] === pattern)?.exclude).toBe(true);
    }
  });
});
