/**
 * Reklam linki çözümleme — web yolu → mobil rota, dış site, uygulama içi web ve
 * satın almaya götüren hedeflerin (dijital satış kapalı) engellenmesi.
 */
import { Linking } from 'react-native';

const mockPush = jest.fn();
const mockDismissTo = jest.fn();
jest.mock('expo-router', () => ({
  router: {
    push: (...a: unknown[]) => mockPush(...a),
    dismissTo: (...a: unknown[]) => mockDismissTo(...a),
  },
}));

import { openAdLink, resolveAdLink, isOwnWebUrl, isPurchaseLink } from '../openAdLink';

const route = (r: string) => ({ kind: 'route', route: r });
const LISTING_ID = '0b1e5c1a-7d2f-4e3a-9c4b-5d6e7f8a9b0c';

describe('resolveAdLink — mobil karşılığı olan web yolları', () => {
  it.each([
    ['/manufacturers/hot-wheels', '/ureticiler/hot-wheels'],
    ['/manufacturers', '/ureticiler'],
    ['/u/42', '/seller/42'],
    ['/wishlist', '/favorites'],
    ['/cart', '/cart'],
    ['/faq', '/help'],
    ['/terms', '/terms'],
    ['/en/refund-policy', '/refund-policy'],
    ['/sell', '/(tabs)/sell'],
  ])('%s → %s', (input, expected) => {
    expect(resolveAdLink(input)).toEqual(route(expected));
  });

  it('kendi sitemizin mutlak adresini ve locale önekini de çözer', () => {
    expect(resolveAdLink('https://tarodan.com.tr/en/seller-agreement')).toEqual(route('/seller-agreement'));
    expect(resolveAdLink('https://staging.tarodan.com.tr/u/7')).toEqual(route('/seller/7'));
  });

  it('ortak eşleyiciden gelen yollar (ürün, koleksiyon) korunur', () => {
    expect(resolveAdLink(`https://tarodan.com.tr/listings/ferrari-${LISTING_ID}`)).toEqual(route(`/product/${LISTING_ID}`));
    expect(resolveAdLink('/collections/9')).toEqual(route('/collections/9'));
  });

  it('ilan listesi sorgusu (filtre) düşmez', () => {
    expect(resolveAdLink('/listings?manufacturer=Hot+Wheels')).toEqual(
      route('/search?manufacturer=Hot+Wheels'),
    );
    expect(resolveAdLink('https://tarodan.com.tr/listings?manufacturer=Hot+Wheels')).toEqual(
      route('/search?manufacturer=Hot+Wheels'),
    );
  });
});

describe('resolveAdLink — eşlenemeyen yol uygulama içi web ekranına gider', () => {
  it('bilinmeyen site yolu: rota değil, kendi sitemizin https adresi', () => {
    const t = resolveAdLink('/some-new-campaign/page');
    expect(t.kind).toBe('web');
    expect((t as { url: string }).url).toMatch(/^https:\/\/.+\/some-new-campaign\/page$/);
  });

  it('kendi sitemizin mutlak adresi aynen taşınır', () => {
    expect(resolveAdLink('https://tarodan.com.tr/some-new-campaign')).toEqual({
      kind: 'web',
      url: 'https://tarodan.com.tr/some-new-campaign',
    });
  });

  it('uygulama içi web ekranı yalnız kendi https adreslerini kabul eder', () => {
    expect(isOwnWebUrl('https://tarodan.com.tr/x')).toBe(true);
    expect(isOwnWebUrl('http://tarodan.com.tr/x')).toBe(false);
    expect(isOwnWebUrl('https://evil.example/x')).toBe(false);
    expect(isOwnWebUrl(null)).toBe(false);
  });
});

describe('resolveAdLink — dış site ve güvenlik', () => {
  it('dış adres sistem tarayıcısına gider', () => {
    expect(resolveAdLink('https://example.org/kampanya')).toEqual({
      kind: 'external',
      url: 'https://example.org/kampanya',
    });
  });

  it.each(['javascript:alert(1)', 'data:text/html,x', '//evil.com/x', '/\\evil.com', 'tarodan://membership', '', '   ', null, undefined])(
    'güvensiz/boş %p engellenir',
    (input) => {
      expect(resolveAdLink(input as string | null | undefined)).toEqual({ kind: 'blocked', reason: 'unsafe' });
    },
  );
});

describe('resolveAdLink — dijital satışa götüren hedefler engellenir', () => {
  it.each([
    '/membership',
    '/membership/checkout',
    '/membership/success?tier=premium',
    '/en/membership',
    'https://tarodan.com.tr/membership',
    'https://tarodan.com.tr/en/membership/checkout',
    '/pricing',
    '/upgrade',
    '/boost',
    '/profile/membership',
    '/profile/boost',
    '/settings/subscription',
  ])('%s', (input) => {
    expect(resolveAdLink(input)).toEqual({ kind: 'blocked', reason: 'purchase' });
  });

  it.each([
    'http://tarodan.com.tr/membership',
    'http://www.tarodan.com.tr/en/membership/',
    'HTTP://tarodan.com.tr/tr/boost?x=1',
    'https://tarodan.com.tr/en/pricing',
    '/tr/subscription',
  ])('isPurchaseLink: %s (http, https ve locale önekli)', (input) => {
    expect(isPurchaseLink(input)).toBe(true);
    expect(resolveAdLink(input)).toEqual({ kind: 'blocked', reason: 'purchase' });
  });

  it('isPurchaseLink: dış host, güvensiz şema ve sıradan yollar satın alma sayılmaz', () => {
    expect(isPurchaseLink('https://example.org/membership')).toBe(false);
    expect(isPurchaseLink('http://example.org/membership')).toBe(false);
    expect(isPurchaseLink('javascript:alert(1)')).toBe(false);
    expect(isPurchaseLink('/listings')).toBe(false);
    expect(isPurchaseLink(null)).toBe(false);
  });

  it.each([
    '/about',
    '/secure-swap',
    '/platform-service-fee',
    '/buyer-protection',
    '/returns-exchanges',
    '/guides',
    '/size-guide',
    '/sayfa/hakkimizda',
    '/en/shipping-delivery',
  ])('mobilden kaldırılan bilgi sayfası %s web görünümüne düşer', (input) => {
    const t = resolveAdLink(input);
    expect(t.kind).toBe('web');
    expect((t as { url: string }).url).toMatch(/^https:\/\//);
  });

  it('benzer adlı alakasız yollar engellenmez', () => {
    expect(resolveAdLink('/membership-guide-not-a-thing').kind).not.toBe('blocked');
    expect(resolveAdLink('/profile/orders/12')).toEqual(route('/orders/12'));
  });
});

describe('openAdLink', () => {
  let openURL: jest.SpyInstance;
  beforeEach(() => {
    mockPush.mockClear();
    openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
  });
  afterEach(() => openURL.mockRestore());

  it('rota: router.push; dış: Linking; web: uygulama içi ekran; engelli: hiçbiri', () => {
    expect(openAdLink('/privacy')).toBe(true);
    expect(mockPush).toHaveBeenLastCalledWith('/privacy');

    expect(openAdLink('https://example.org/x')).toBe(true);
    expect(openURL).toHaveBeenCalledWith('https://example.org/x');

    mockPush.mockClear();
    expect(openAdLink('https://tarodan.com.tr/new-page')).toBe(true);
    expect(mockPush).toHaveBeenCalledWith(
      `/in-app-web?url=${encodeURIComponent('https://tarodan.com.tr/new-page')}`,
    );

    mockPush.mockClear();
    openURL.mockClear();
    expect(openAdLink('/membership')).toBe(false);
    expect(openAdLink('javascript:alert(1)')).toBe(false);
    expect(mockPush).not.toHaveBeenCalled();
    expect(openURL).not.toHaveBeenCalled();
  });

  it('sekme hedefi (sepet, favoriler, ana sayfa) ikinci (tabs) itmez: dismissTo', () => {
    mockPush.mockClear();
    mockDismissTo.mockClear();
    expect(openAdLink('/cart')).toBe(true);
    expect(mockDismissTo).toHaveBeenLastCalledWith('/(tabs)/cart');
    expect(openAdLink('/wishlist')).toBe(true);
    expect(mockDismissTo).toHaveBeenLastCalledWith('/(tabs)/favorites');
    expect(mockPush).not.toHaveBeenCalled();
  });
});

/**
 * Ad hotspots and banners link to listings with whatever URL the admin pasted: the canonical
 * `/listings/<slug>-<uuid>` with campaign parameters, an old bare-uuid link, or a broken one.
 * A listing link opens the native product screen by the uuid; one with no uuid never pushes an
 * unknown route and falls back to the in-app web page (where the site answers it).
 */
describe('resolveAdLink: listing links (ADR 0017)', () => {
  const SEGMENT = `ferrari-f40-${LISTING_ID}`;

  it.each([
    ['a relative canonical link with utm parameters', `/listings/${SEGMENT}?utm_source=ad&utm_campaign=x`],
    ['an absolute canonical link with a trailing slash', `https://tarodan.com.tr/listings/${SEGMENT}/`],
    ['an English canonical link', `https://tarodan.com.tr/en/listings/${SEGMENT}`],
    ['a stale slug with an upper-case uuid', `/listings/eski-${LISTING_ID.toUpperCase()}`],
  ])('%s opens the product screen with the bare uuid', (_label, link) => {
    expect(resolveAdLink(link)).toEqual(route(`/product/${LISTING_ID}`));
  });

  it('a listing link without a uuid opens the site in the in-app web screen, not a route', () => {
    expect(resolveAdLink('/listings/garbage')).toEqual({ kind: 'web', url: 'https://tarodan.com.tr/listings/garbage' });
  });

  it('openAdLink pushes the product route for a canonical listing link', () => {
    mockPush.mockClear();
    expect(openAdLink(`https://tarodan.com.tr/listings/${SEGMENT}?utm_source=ad`)).toBe(true);
    expect(mockPush).toHaveBeenCalledWith(`/product/${LISTING_ID}`);
  });
});
