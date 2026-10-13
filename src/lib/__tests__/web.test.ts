/**
 * B4 inceleme 8 · Web taban adresi TEK yerde (`@/lib/web`): reklam linkleri,
 * paylaşım linkleri ve CMS sayfası gezinmesi aynı türetimi ve aynı yedeği
 * kullanır.
 */
import { DEFAULT_WEB_BASE, ownWebPageUrl, webBaseUrl } from '@/lib/web';
import { collectionShareUrl, productShareUrl } from '@/utils/share';
import { resolveAdLink } from '@/lib/ads/openAdLink';
import { decideCmsNavigation } from '../../../app/sayfa/_lib/navigation';

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

  it('üç tüketici aynı tabanı kullanır (paylaşım, reklam, CMS)', () => {
    process.env.EXPO_PUBLIC_WEB_URL = 'https://staging.tarodan.com.tr';
    expect(productShareUrl('p1')).toBe('https://staging.tarodan.com.tr/listings/p1');
    expect(collectionShareUrl('c1')).toBe('https://staging.tarodan.com.tr/collections/c1');
    expect(resolveAdLink('/bilinmeyen-yol-xyz')).toEqual({
      kind: 'web',
      url: 'https://staging.tarodan.com.tr/bilinmeyen-yol-xyz',
    });
    expect(decideCmsNavigation('/bilinmeyen-yol-xyz')).toEqual({
      action: 'external',
      url: 'https://staging.tarodan.com.tr/bilinmeyen-yol-xyz',
    });
  });
});
