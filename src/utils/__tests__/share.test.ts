import { Platform } from 'react-native';
import { buildShareContent, productShareUrl, collectionShareUrl } from '../share';
import { toMobileRoute } from '../notificationRoute';

const ID = '0b1e5c1a-7d2f-4e3a-9c4b-5d6e7f8a9b0c';

describe('share urls', () => {
  it('points product links at the real tarodan.com.tr domain, in the canonical slug-uuid form', () => {
    // EXPO_PUBLIC_WEB_URL is unset in the test environment, so the safe fallback applies.
    expect(productShareUrl({ id: ID, title: 'Ferrari F40 1:18 Bburago Kırmızı' })).toBe(
      `https://tarodan.com.tr/listings/ferrari-f40-1-18-bburago-kirmizi-${ID}`,
    );
    expect(collectionShareUrl('col-1')).toBe('https://tarodan.com.tr/collections/col-1');
  });

  it('transliterates Turkish letters and cuts the slug at 80 characters', () => {
    const url = productShareUrl({ id: ID, title: 'Öz Çelik Şahin Ğ ı İ' });
    expect(url).toBe(`https://tarodan.com.tr/listings/oz-celik-sahin-g-i-i-${ID}`);
    const long = productShareUrl({ id: ID, title: 'araba '.repeat(40) });
    const slug = long.replace('https://tarodan.com.tr/listings/', '').slice(0, -(ID.length + 1));
    expect(slug.length).toBeLessThanOrEqual(80);
    expect(long.endsWith(`-${ID}`)).toBe(true);
  });

  it('is the bare uuid when the title has no usable slug (empty, symbols, reserved word)', () => {
    expect(productShareUrl({ id: ID })).toBe(`https://tarodan.com.tr/listings/${ID}`);
    expect(productShareUrl({ id: ID, title: '' })).toBe(`https://tarodan.com.tr/listings/${ID}`);
    expect(productShareUrl({ id: ID, title: '!!!' })).toBe(`https://tarodan.com.tr/listings/${ID}`);
    expect(productShareUrl({ id: ID, title: 'Edit' })).toBe(`https://tarodan.com.tr/listings/${ID}`);
  });

  it('a shared link maps back to the same listing through the deep-link mapper', () => {
    const url = productShareUrl({ id: ID, title: 'Öz Çelik' });
    expect(toMobileRoute(url.replace('https://tarodan.com.tr', ''))).toBe(`/product/${ID}`);
  });
});

describe('buildShareContent', () => {
  const url = 'https://tarodan.com.tr/listings/abc123';
  const text = 'Tomica Toyota Hilux - 130,38 TL\n\nTarodan\'da bu ürüne göz atın!';

  afterEach(() => {
    Platform.OS = 'ios';
  });

  it('embeds the url in the message on iOS so "Kopyala" keeps the link', () => {
    Platform.OS = 'ios';
    const { content } = buildShareContent(text, url, 'Tomica Toyota Hilux');
    expect(content.message).toContain(url); // link metnin içinde — kopyalayınca düşmez
    expect((content as { url?: string }).url).toBe(url); // zengin önizleme için ayrı alan da kalsın
  });

  it('embeds the url in the message on Android', () => {
    Platform.OS = 'android';
    const { content } = buildShareContent(text, url, 'Tomica Toyota Hilux');
    expect(content.message).toContain(url);
  });
});
