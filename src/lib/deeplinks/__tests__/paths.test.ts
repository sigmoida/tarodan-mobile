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
  toAndroidPathEntry,
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
  it('cipiak + her locale onekli varyanti uretir', () => {
    expect(withLocaleVariants('/listings/*')).toEqual([
      '/listings/*',
      '/tr/listings/*',
      '/en/listings/*',
    ]);
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
