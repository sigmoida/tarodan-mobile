import { Platform } from 'react-native';
import type { HeroSlide, TrustBadge } from '@/lib/api/hero';
import {
  MAX_TRUST_BADGES,
  heroImageUrl,
  pickLocalized,
  resolveHeroCta,
  resolveTrustBadges,
  visibleSlides,
} from '../heroView';

const slide = (over: Partial<HeroSlide> = {}): HeroSlide => ({
  id: 's1',
  placement: 'home',
  imageUrl: 'https://cdn.example/a.jpg',
  mobileImageUrl: null,
  imageSide: 'right',
  title: { tr: 'Başlık', en: 'Title' },
  subtitle: null,
  imageAlt: null,
  cta1: null,
  cta2: null,
  hideOnIos: false,
  ...over,
});

describe('pickLocalized', () => {
  it('en dolu ve dil en ise İngilizce', () => {
    expect(pickLocalized({ tr: 'Merhaba', en: 'Hello' }, 'en')).toBe('Hello');
    expect(pickLocalized({ tr: 'Merhaba', en: 'Hello' }, 'en-US')).toBe('Hello');
  });
  it('en boşsa ya da dil tr ise Türkçe', () => {
    expect(pickLocalized({ tr: 'Merhaba', en: '  ' }, 'en')).toBe('Merhaba');
    expect(pickLocalized({ tr: 'Merhaba', en: 'Hello' }, 'tr')).toBe('Merhaba');
  });
  it('değer yoksa boş metin', () => {
    expect(pickLocalized(null, 'tr')).toBe('');
    expect(pickLocalized(undefined, 'en')).toBe('');
  });
});

describe('heroImageUrl', () => {
  it('mobileImageUrl ?? imageUrl', () => {
    expect(heroImageUrl(slide({ mobileImageUrl: 'https://cdn.example/m.jpg' }))).toBe('https://cdn.example/m.jpg');
    expect(heroImageUrl(slide())).toBe('https://cdn.example/a.jpg');
  });
});

describe('visibleSlides', () => {
  it('hideOnIos: true olan slayt native uygulamada (iki platform) gösterilmez', () => {
    const out = visibleSlides([slide({ id: 'a', hideOnIos: true }), slide({ id: 'b' })], 'tr');
    expect(out.map((s) => s.id)).toEqual(['b']);
  });

  it.each(['ios', 'android'] as const)('hideOnIos her iki platformda uygulanır (%s)', (os) => {
    Object.defineProperty(Platform, 'OS', { value: os, writable: true, configurable: true });
    try {
      const out = visibleSlides([slide({ id: 'a', hideOnIos: true }), slide({ id: 'b' })], 'tr');
      expect(out.map((s) => s.id)).toEqual(['b']);
    } finally {
      Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true, configurable: true });
    }
  });

  it('satın almaya giden CTA varsa slaytın kendisi gizlenir', () => {
    const buy = { label: { tr: 'Premium' }, href: '/membership' };
    expect(visibleSlides([slide({ cta1: buy })], 'tr')).toEqual([]);
    expect(visibleSlides([slide({ cta2: { ...buy, href: 'https://tarodan.com.tr/tr/pricing' } })], 'tr')).toEqual([]);
  });

  it('görseli ya da başlığı olmayan slayt elenir; sırayı değiştirmez', () => {
    const out = visibleSlides(
      [slide({ id: 'a' }), slide({ id: 'b', title: { tr: '' } }), slide({ id: 'c', imageUrl: '' }), slide({ id: 'd' })],
      'tr',
    );
    expect(out.map((s) => s.id)).toEqual(['a', 'd']);
  });

  it('boş / geçersiz girdi → []', () => {
    expect(visibleSlides([], 'tr')).toEqual([]);
    expect(visibleSlides(null, 'tr')).toEqual([]);
    expect(visibleSlides({} as any, 'tr')).toEqual([]);
  });
});

describe('resolveHeroCta / satın alma kapısı', () => {
  it('normal site içi yol çizilir; etiket dile göre', () => {
    expect(resolveHeroCta({ label: { tr: 'Gez', en: 'Browse' }, href: '/listings' }, 'en')).toEqual({
      label: 'Browse',
      href: '/listings',
    });
  });
  it('satın alma hedefi, güvensiz şema ve boş etiket → null', () => {
    expect(resolveHeroCta({ label: { tr: 'Al' }, href: '/membership' }, 'tr')).toBeNull();
    expect(resolveHeroCta({ label: { tr: 'Al' }, href: '/boost/123' }, 'tr')).toBeNull();
    expect(resolveHeroCta({ label: { tr: 'X' }, href: 'javascript:alert(1)' }, 'tr')).toBeNull();
    expect(resolveHeroCta({ label: { tr: '' }, href: '/listings' }, 'tr')).toBeNull();
    expect(resolveHeroCta(null, 'tr')).toBeNull();
  });
  it('http / https / locale önekli satın alma linkli slayt gizlenir, dış host ve güvensiz şema slaytı gizlemez', () => {
    const cta = (href: string) => ({ label: { tr: 'Git' }, href });
    for (const href of [
      'http://tarodan.com.tr/membership',
      'https://tarodan.com.tr/membership',
      'http://www.tarodan.com.tr/en/membership/',
      'https://tarodan.com.tr/en/pricing?x=1',
      '/tr/boost/',
      '/en/membership',
    ]) {
      expect(visibleSlides([slide({ cta1: cta(href) })], 'tr')).toEqual([]);
      expect(resolveHeroCta(cta(href), 'tr')).toBeNull();
    }
    for (const href of ['https://example.org/membership', 'http://example.org/membership', 'javascript:alert(1)']) {
      expect(visibleSlides([slide({ cta1: cta(href) })], 'tr')).toHaveLength(1);
    }
    // Güvensiz şemada yalnız buton düşer, dış host'ta buton kalır.
    expect(resolveHeroCta(cta('javascript:alert(1)'), 'tr')).toBeNull();
    expect(resolveHeroCta(cta('https://example.org/membership'), 'tr')).toEqual({
      label: 'Git',
      href: 'https://example.org/membership',
    });
  });
});

describe('resolveTrustBadges', () => {
  const badge = (over: Partial<TrustBadge> = {}): TrustBadge => ({
    id: 'b1',
    icon: 'truck',
    title: { tr: 'Hızlı kargo', en: 'Fast shipping' },
    description: { tr: 'Açıklama' },
    ...over,
  });

  it('ikon eşlenir, metin dile göre seçilir', () => {
    expect(resolveTrustBadges([badge()], 'en')).toEqual([
      { id: 'b1', icon: 'truck', title: 'Fast shipping', description: 'Açıklama' },
    ]);
  });
  it('bilinmeyen ikon anahtarı ve başlıksız rozet gösterilmez', () => {
    const out = resolveTrustBadges(
      [badge({ id: 'x', icon: 'rocket' }), badge({ id: 'y', title: { tr: '' } }), badge({ id: 'z' })],
      'tr',
    );
    expect(out.map((b) => b.id)).toEqual(['z']);
  });
  it('üst sınır uygulanır', () => {
    const many = Array.from({ length: 30 }, (_, i) => badge({ id: `b${i}` }));
    expect(resolveTrustBadges(many, 'tr')).toHaveLength(MAX_TRUST_BADGES);
  });
  it('boş / geçersiz → []', () => {
    expect(resolveTrustBadges([], 'tr')).toEqual([]);
    expect(resolveTrustBadges(undefined, 'tr')).toEqual([]);
  });
});
