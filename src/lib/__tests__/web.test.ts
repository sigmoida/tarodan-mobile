/**
 * B4 inceleme 8 · Web taban adresi TEK yerde (`@/lib/web`): reklam linkleri,
 * paylaşım linkleri ve yasal belge ekranları (web uygulama modu) aynı
 * türetimi ve aynı yedeği kullanır.
 */
import { DEFAULT_WEB_BASE, isOtherEnvironmentHost, ownWebHosts, ownWebPageUrl, webBaseUrl } from '@/lib/web';
import { collectionShareUrl, productShareUrl } from '@/utils/share';
import { resolveAdLink } from '@/lib/ads/openAdLink';
import { legalEmbedUrl } from '@/lib/legal/webDocs';

const ORIGINAL = process.env.EXPO_PUBLIC_WEB_URL;
afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.EXPO_PUBLIC_WEB_URL;
  else process.env.EXPO_PUBLIC_WEB_URL = ORIGINAL;
});

describe('@/lib/web', () => {
  it('yedek prod adresi derin bağlantı yapılandırmasının birincil alan adı', () => {
    expect(DEFAULT_WEB_BASE).toBe('https://tarodan.com.tr');
    delete process.env.EXPO_PUBLIC_WEB_URL;
    expect(webBaseUrl()).toBe('https://tarodan.com.tr');
    expect(ownWebPageUrl('cookies')).toBe('https://tarodan.com.tr/cookies');
  });

  it('env adresi önce gelir, sondaki / atılır', () => {
    process.env.EXPO_PUBLIC_WEB_URL = 'https://staging.tarodan.com.tr//';
    expect(webBaseUrl()).toBe('https://staging.tarodan.com.tr');
    expect(ownWebPageUrl('/about')).toBe('https://staging.tarodan.com.tr/about');
  });

  it('üç tüketici aynı tabanı kullanır (paylaşım, reklam, yasal belgeler)', () => {
    process.env.EXPO_PUBLIC_WEB_URL = 'https://staging.tarodan.com.tr';
    expect(productShareUrl('p1')).toBe('https://staging.tarodan.com.tr/listings/p1');
    expect(collectionShareUrl('c1')).toBe('https://staging.tarodan.com.tr/collections/c1');
    expect(resolveAdLink('/bilinmeyen-yol-xyz')).toEqual({
      kind: 'web',
      url: 'https://staging.tarodan.com.tr/bilinmeyen-yol-xyz',
    });
    expect(legalEmbedUrl('terms', 'tr')).toBe('https://staging.tarodan.com.tr/app/terms');
    expect(legalEmbedUrl('terms', 'en')).toBe('https://staging.tarodan.com.tr/en/app/terms');
  });
});

describe('ownWebHosts — ortam başına kendi alan adlarımız', () => {
  it('production: yalnız production alan adları (staging ve env adresi yok)', () => {
    const hosts = ownWebHosts('production', 'https://staging.tarodan.com.tr');
    expect([...hosts].sort()).toEqual(['tarodan.com.tr', 'www.tarodan.com.tr']);
    expect(isOtherEnvironmentHost('staging.tarodan.com.tr', hosts)).toBe(true);
    expect(isOtherEnvironmentHost('tarodan.com.tr', hosts)).toBe(false);
    // Yabancı site "başka ortam" değildir (o, dış link kuralına tabi).
    expect(isOtherEnvironmentHost('example.com', hosts)).toBe(false);
  });

  it('preview / development: production + staging + env host', () => {
    const hosts = ownWebHosts('preview', 'https://staging.tarodan.com.tr');
    expect(hosts.has('staging.tarodan.com.tr')).toBe(true);
    expect(hosts.has('tarodan.com.tr')).toBe(true);
    expect(isOtherEnvironmentHost('staging.tarodan.com.tr', hosts)).toBe(false);
    expect(ownWebHosts(undefined, 'https://web.local.test').has('web.local.test')).toBe(true);
    // Varsayılan dışı portlu env adresi kendi sitemiz sayılmaz (katı ayrıştırma).
    expect(ownWebHosts(undefined, 'https://localhost:3000').has('localhost')).toBe(false);
  });
});

describe('production build: staging adresi hiçbir yoldan açılmaz', () => {
  type Mods = {
    openAdLink: typeof import('@/lib/ads/openAdLink');
    guard: typeof import('@/lib/ads/webViewGuard');
    route: typeof import('@/utils/notificationRoute');
  };
  // Uygulamada `EXPO_PUBLIC_*` derlemede literal'e çevrilir; testte koşu boyunca set kalır.
  const prevEnv = process.env.EXPO_PUBLIC_ENVIRONMENT;
  beforeEach(() => {
    process.env.EXPO_PUBLIC_ENVIRONMENT = 'production';
    process.env.EXPO_PUBLIC_WEB_URL = 'https://tarodan.com.tr';
  });
  afterEach(() => {
    if (prevEnv === undefined) delete process.env.EXPO_PUBLIC_ENVIRONMENT;
    else process.env.EXPO_PUBLIC_ENVIRONMENT = prevEnv;
  });
  const load = (): Mods => {
    let mods: Mods | undefined;
    jest.isolateModules(() => {
      mods = {
        openAdLink: require('@/lib/ads/openAdLink'),
        guard: require('@/lib/ads/webViewGuard'),
        route: require('@/utils/notificationRoute'),
      };
    });
    return mods!;
  };

  it('reklam linki engellenir; uygulama içi web ve WebView adresi kabul etmez', () => {
    const { openAdLink, guard } = load();
    expect(openAdLink.resolveAdLink('https://staging.tarodan.com.tr/listings')).toEqual({
      kind: 'blocked',
      reason: 'unsafe',
    });
    expect(openAdLink.isOwnWebUrl('https://staging.tarodan.com.tr/about')).toBe(false);
    expect(guard.isAllowedOwnPage('https://staging.tarodan.com.tr/about')).toBe(false);
    // Üst çerçevede staging'e gezinme: tarayıcıya da gönderilmez.
    expect(guard.decideWebRequest('https://staging.tarodan.com.tr/about', true)).toBe('block');
    // Production sitesi ve dış siteler her zamanki gibi.
    expect(openAdLink.isOwnWebUrl('https://tarodan.com.tr/about')).toBe(true);
    expect(guard.decideWebRequest('https://example.com/x', true)).toBe('external');
  });

  it.each([
    'https://x@staging.tarodan.com.tr/listings',
    'https://tarodan.com.tr@staging.tarodan.com.tr/listings',
    'https://staging.tarodan.com.tr:443@evil.example/x',
    'https://tarodan.com.tr:8443/listings',
    'https://tarodan.com.tr\\@staging.tarodan.com.tr/x',
  ])('userinfo / port / ters eğik çizgi ile atlatma yok: %s', (url) => {
    const { openAdLink, guard, route } = load();
    expect(openAdLink.resolveAdLink(url)).toEqual({ kind: 'blocked', reason: 'unsafe' });
    expect(openAdLink.isOwnWebUrl(url)).toBe(false);
    expect(guard.decideWebRequest(url, true)).toBe('block');
    expect(route.notificationRoute({ link: url })).toBeNull();
  });

  it('bildirim linkindeki staging adresi rota kaynağı sayılmaz', () => {
    const { route } = load();
    expect(route.notificationRoute({ link: 'https://staging.tarodan.com.tr/profile/orders/12' })).toBeNull();
    expect(route.notificationRoute({ link: 'https://tarodan.com.tr/profile/orders/12' })).not.toBeNull();
  });
});
