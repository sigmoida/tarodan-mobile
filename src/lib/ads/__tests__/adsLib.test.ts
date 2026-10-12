jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

import { pickAd } from '../pickAd';
import { adAspectRatio, naturalRatioOf, FALLBACK_AD_RATIO } from '../adAspect';
import { renderableHotspots, hotspotStyle } from '../hotspots';
import { remaining } from '../countdown';
import { safeAdHref } from '../safeAdHref';

describe('pickAd — yuvada TEK reklam', () => {
  const ads = ['a', 'b', 'c'];

  it('boş listede null', () => {
    expect(pickAd([], 'header', 5)).toBeNull();
  });

  it('aynı (liste, yuva, tohum) hep aynı reklamı verir', () => {
    expect(pickAd(ads, 'header', 7)).toBe(pickAd(ads, 'header', 7));
  });

  it('tohum değişince dönüşüm olur: tüm reklamlar sırayla seçilebilir', () => {
    const seen = new Set([0, 1, 2].map((seed) => pickAd(ads, 'header', seed)));
    expect(seen.size).toBe(3);
  });

  it('tek reklamda onu verir', () => {
    expect(pickAd(['x'], 'header', 123)).toBe('x');
  });
});

describe('adAspectRatio', () => {
  it('gerçek görsel oranı kayıtlı ölçüden önce gelir', () => {
    expect(adAspectRatio({ width: 1200, height: 300 }, 'header', 2)).toBe(2);
  });
  it('gerçek oran yoksa kayıtlı ölçü, o da yoksa konum varsayılanı', () => {
    expect(adAspectRatio({ width: 320, height: 50 }, 'header')).toBe(320 / 50);
    expect(adAspectRatio({ width: null, height: null }, 'header')).toBe(FALLBACK_AD_RATIO.header);
    expect(adAspectRatio({ width: 0, height: 10 }, 'popup', Number.NaN)).toBe(FALLBACK_AD_RATIO.popup);
  });
  it('naturalRatioOf ölçüsü okunamazsa null', () => {
    expect(naturalRatioOf({ width: 400, height: 100 })).toBe(4);
    expect(naturalRatioOf({ width: 0, height: 100 })).toBeNull();
    expect(naturalRatioOf(undefined)).toBeNull();
  });
});

describe('renderableHotspots', () => {
  const h = (over: Record<string, unknown> = {}) => ({
    id: 'h', x: 0, y: 0, width: 0.5, height: 0.5, label: 'l', linkUrl: '/listings', sortOrder: 0, ...over,
  });

  it('görselsiz reklamda bölge yok; eski yanıtta hotspots alanı yoksa []', () => {
    expect(renderableHotspots({ imageUrl: null, hotspots: [h()] })).toEqual([]);
    expect(renderableHotspots({ imageUrl: 'https://x/a.png' })).toEqual([]);
  });

  it('taşan, sıfır boyutlu, güvensiz ve satın almaya giden bölgeleri eler; sıralar', () => {
    const out = renderableHotspots({
      imageUrl: 'https://x/a.png',
      hotspots: [
        h({ id: 'b', sortOrder: 2 }),
        h({ id: 'a', sortOrder: 1 }),
        h({ id: 'over', x: 0.8 }),
        h({ id: 'zero', width: 0 }),
        h({ id: 'js', linkUrl: 'javascript:alert(1)' }),
        h({ id: 'buy', linkUrl: '/membership' }),
      ],
    });
    expect(out.map((x) => x.id)).toEqual(['a', 'b']);
  });

  it('hotspotStyle oranı yüzdeye çevirir', () => {
    expect(hotspotStyle({ x: 0.1, y: 0.2, width: 0.5, height: 0.25 })).toEqual({
      left: '10%', top: '20%', width: '50%', height: '25%',
    });
  });
});

describe('remaining', () => {
  const now = Date.UTC(2026, 0, 1, 0, 0, 0);
  it('saat:dakika:saniye ve gün biçimi', () => {
    expect(remaining(new Date(now + 3_725_000).toISOString(), now)).toBe('01:02:05');
    expect(remaining(new Date(now + (3 * 86400 + 4 * 3600 + 12 * 60) * 1000).toISOString(), now)).toBe('3g 04:12');
  });
  it('bitmiş ya da geçersiz tarihte null', () => {
    expect(remaining(new Date(now - 1000).toISOString(), now)).toBeNull();
    expect(remaining('not-a-date', now)).toBeNull();
  });
});

describe('safeAdHref', () => {
  it('yalnız http(s) ve site-içi yol', () => {
    expect(safeAdHref(' https://a.com/x ')).toBe('https://a.com/x');
    expect(safeAdHref('/listings')).toBe('/listings');
    expect(safeAdHref('//evil.com')).toBeNull();
    expect(safeAdHref('javascript:alert(1)')).toBeNull();
    expect(safeAdHref(null)).toBeNull();
  });
});
