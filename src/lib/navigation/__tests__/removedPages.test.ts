/**
 * Mobilden kaldırılan sayfalar — TEK karar noktası. Reklam (`resolveAdLink`),
 * bildirim/push (`toMobileRoute`) ve derin bağlantı (`+native-intent`) aynı
 * hedefi verir: SSS → native Yardım, bilgi/CMS sayfaları → uygulama içi web.
 */
jest.mock('expo-router', () => ({ router: { push: jest.fn(), dismissTo: jest.fn() } }));

import fs from 'fs';
import path from 'path';
import { ownWebPageUrl } from '@/lib/web';
import { toMobileRoute } from '@/utils/notificationRoute';
import { resolveAdLink } from '@/lib/ads/openAdLink';
import { inAppWebHref, resolveRemovedPage } from '../removedPages';
import { redirectSystemPath } from '../../../../app/+native-intent';

const APP_DIR = path.resolve(__dirname, '../../../../app');

const REMOVED = [
  'about',
  'authenticity',
  'collectors-guide',
  'guides',
  'size-guide',
  'payment-options',
  'shipping-delivery',
  'security-features',
  'intellectual-property',
  'buyer-protection',
  'returns-exchanges',
];

describe('resolveRemovedPage', () => {
  it('SSS → native Yardım Merkezi (locale/sorgu fark etmez)', () => {
    expect(resolveRemovedPage('/faq')).toEqual({ kind: 'route', route: '/help' });
    expect(resolveRemovedPage('/en/faq?x=1')).toEqual({ kind: 'route', route: '/help' });
  });

  it.each(REMOVED)('/%s → web görünümü (locale ve sorgu korunur)', (head) => {
    expect(resolveRemovedPage(`/${head}`)).toEqual({ kind: 'web', url: ownWebPageUrl(`/${head}`) });
    expect(resolveRemovedPage(`/en/${head}/?a=1`)).toEqual({
      kind: 'web',
      url: ownWebPageUrl(`/en/${head}?a=1`),
    });
  });

  it('CMS ve eski mobil adlar web yoluna çevrilir', () => {
    expect(resolveRemovedPage('/sayfa/hakkimizda')).toEqual({ kind: 'web', url: ownWebPageUrl('/sayfa/hakkimizda') });
    expect(resolveRemovedPage('/guvenli-takas')).toEqual({ kind: 'web', url: ownWebPageUrl('/secure-swap') });
    expect(resolveRemovedPage('/platform-hizmet-bedeli')).toEqual({
      kind: 'web',
      url: ownWebPageUrl('/platform-service-fee'),
    });
    expect(resolveRemovedPage('/en/secure-swap')).toEqual({ kind: 'web', url: ownWebPageUrl('/en/secure-swap') });
  });

  it('kalan sayfalara dokunmaz', () => {
    for (const p of ['/', '/terms', '/help', '/contact', '/listings/1', '/app/terms', '/aboutness']) {
      expect(resolveRemovedPage(p)).toBeNull();
    }
  });

  it('kaldırılan sayfaların ekranı gerçekten yok', () => {
    for (const head of [...REMOVED, 'faq', 'sayfa', 'guvenli-takas', 'platform-hizmet-bedeli']) {
      expect(fs.existsSync(path.join(APP_DIR, `${head}.tsx`))).toBe(false);
      expect(fs.existsSync(path.join(APP_DIR, head))).toBe(false);
    }
  });
});

describe('üç tüketici aynı kararı verir', () => {
  it('toMobileRoute (bildirim/push): SSS → /help, bilgi sayfası → uygulama içi web', () => {
    expect(toMobileRoute('/faq')).toBe('/help');
    expect(toMobileRoute('/en/about')).toBe(inAppWebHref(ownWebPageUrl('/en/about')));
    expect(toMobileRoute('/sayfa/kvkk')).toBe(inAppWebHref(ownWebPageUrl('/sayfa/kvkk')));
  });

  it('+native-intent (derin bağlantı)', () => {
    expect(redirectSystemPath({ path: 'tarodan://faq', initial: true })).toBe('/help');
    expect(redirectSystemPath({ path: 'tarodan://guvenli-takas', initial: true })).toBe(
      inAppWebHref(ownWebPageUrl('/secure-swap')),
    );
  });

  it('resolveAdLink (reklam)', () => {
    expect(resolveAdLink('/faq')).toEqual({ kind: 'route', route: '/help' });
    expect(resolveAdLink('https://tarodan.com.tr/en/buyer-protection')).toEqual({
      kind: 'web',
      url: ownWebPageUrl('/en/buyer-protection'),
    });
  });
});
