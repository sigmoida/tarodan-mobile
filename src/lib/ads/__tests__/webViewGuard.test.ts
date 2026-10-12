/**
 * Uygulama içi web ekranı kapısı — satın alma sayfalarına HİÇBİR yoldan
 * gezinilemez (Apple 3.1.1), locale önekli biçimler dahil.
 */
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

import { isPurchasePath } from '../purchasePath';
import { resolveAdLink } from '../openAdLink';
import { isAllowedOwnPage, shouldAllowWebRequest } from '../webViewGuard';

const PURCHASE = [
  '/membership',
  '/membership/checkout',
  '/en/membership',
  '/en/membership/checkout?tier=premium',
  '/tr/pricing',
  '/pricing/',
  '/boost',
  '/Membership',
  '/profile/membership',
  '/en/profile/boost',
  '/settings/subscription',
  '/upgrade#x',
];

describe('isPurchasePath — tek kaynak', () => {
  it.each(PURCHASE)('%s satın alma yolu', (p) => {
    expect(isPurchasePath(p)).toBe(true);
  });

  it.each(['/', '/blog/x', '/listings/p-1', '/en/listings', '/membership-guide', '/profile/orders/3'])(
    '%s değil',
    (p) => {
      expect(isPurchasePath(p)).toBe(false);
    },
  );
});

describe('webViewGuard — kendi sitemizde bile satın alma sayfaları açılmaz', () => {
  it.each(PURCHASE)('https://tarodan.com.tr%s engellenir', (p) => {
    const url = `https://tarodan.com.tr${p}`;
    expect(isAllowedOwnPage(url)).toBe(false);
    expect(shouldAllowWebRequest(url)).toBe(false);
  });

  it('sıradan site sayfaları açılır', () => {
    expect(shouldAllowWebRequest('https://tarodan.com.tr/blog/x')).toBe(true);
    expect(shouldAllowWebRequest('https://tarodan.com.tr/en/blog/x?utm=1')).toBe(true);
    expect(shouldAllowWebRequest('about:blank')).toBe(true);
  });

  it('resolveAdLink ile aynı kapıyı paylaşır (tutarlılık)', () => {
    for (const p of PURCHASE) {
      expect(resolveAdLink(p)).toEqual({ kind: 'blocked' });
      expect(resolveAdLink(`https://tarodan.com.tr${p}`)).toEqual({ kind: 'blocked' });
    }
  });
});
