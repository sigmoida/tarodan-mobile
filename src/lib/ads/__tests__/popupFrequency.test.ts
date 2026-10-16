const mockStore = new Map<string, string>();
const mockGet = jest.fn((k: string) => Promise.resolve(mockStore.get(k) ?? null));
const mockSet = jest.fn((k: string, v: string) => {
  mockStore.set(k, v);
  return Promise.resolve();
});
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: (k: string) => mockGet(k),
    setItem: (k: string, v: string) => mockSet(k, v),
  },
}));

import {
  filterDismissedPopupAds,
  markPopupAdDismissed,
  popupDismissKey,
  popupFrequencyOf,
  popupVersionOf,
  POPUP_AD_DISMISSED_PREFIX,
} from '../popupFrequency';

const NOW = 1_800_000_000_000;
type Ad = { id: string; popupFrequency?: 'every_visit' | 'until_dismissed'; popupVersion?: number };

beforeEach(() => {
  mockStore.clear();
  mockGet.mockClear();
  mockSet.mockClear();
});

describe('varsayılanlar (eski API: alanlar yok)', () => {
  it('sıklık until_dismissed, sürüm 1', () => {
    const legacy: Ad = { id: 'a' };
    expect(popupFrequencyOf(legacy)).toBe('until_dismissed');
    expect(popupVersionOf(legacy)).toBe(1);
    expect(popupDismissKey(legacy)).toBe('tarodan.popupAd.dismissed.a:1');
    expect(POPUP_AD_DISMISSED_PREFIX).toBe('tarodan.popupAd.dismissed.');
  });

  it('bilinmeyen sıklık / bozuk sürüm de güvenli varsayılana düşer', () => {
    expect(popupFrequencyOf({ popupFrequency: 'weekly' as never })).toBe('until_dismissed');
    expect(popupVersionOf({ popupVersion: Number.NaN })).toBe(1);
    expect(popupVersionOf({ popupVersion: '3' as never })).toBe(1);
  });
});

describe('markPopupAdDismissed', () => {
  it('until_dismissed: kapatınca reklam+sürüm anahtarını yazar', async () => {
    await markPopupAdDismissed({ id: 'a', popupFrequency: 'until_dismissed', popupVersion: 2 }, NOW);
    expect(mockSet).toHaveBeenCalledWith('tarodan.popupAd.dismissed.a:2', String(NOW));
  });

  it('every_visit: hiçbir şey yazmaz', async () => {
    await markPopupAdDismissed({ id: 'a', popupFrequency: 'every_visit', popupVersion: 2 }, NOW);
    expect(mockSet).not.toHaveBeenCalled();
  });

  it('yazma hatası fırlatmaz', async () => {
    mockSet.mockImplementationOnce(() => Promise.reject(new Error('quota')));
    await expect(markPopupAdDismissed({ id: 'a' }, NOW)).resolves.toBeUndefined();
  });
});

describe('filterDismissedPopupAds', () => {
  it('kapatılmış until_dismissed reklamı eler, diğerlerini sırasıyla bırakır', async () => {
    const a: Ad = { id: 'a', popupFrequency: 'until_dismissed', popupVersion: 1 };
    const b: Ad = { id: 'b', popupFrequency: 'until_dismissed', popupVersion: 1 };
    await markPopupAdDismissed(a, NOW);
    await expect(filterDismissedPopupAds([a, b])).resolves.toEqual([b]);
  });

  it('sürüm artınca kapatılmış reklam yeniden gösterilir', async () => {
    await markPopupAdDismissed({ id: 'a', popupVersion: 1 }, NOW);
    await expect(filterDismissedPopupAds([{ id: 'a', popupVersion: 1 }])).resolves.toEqual([]);
    const v2 = { id: 'a', popupVersion: 2 };
    await expect(filterDismissedPopupAds([v2])).resolves.toEqual([v2]);
  });

  it('every_visit hiç elenmez (anahtar okunmaz; eski bir anahtar kalmış olsa bile)', async () => {
    mockStore.set('tarodan.popupAd.dismissed.a:1', String(NOW));
    const ad: Ad = { id: 'a', popupFrequency: 'every_visit', popupVersion: 1 };
    await expect(filterDismissedPopupAds([ad])).resolves.toEqual([ad]);
    expect(mockGet).not.toHaveBeenCalled();
  });

  it('eski API (alan yok) kapatılınca da elenir: until_dismissed varsayılanı', async () => {
    const legacy: Ad = { id: 'old' };
    await markPopupAdDismissed(legacy, NOW);
    expect(mockSet).toHaveBeenCalledWith('tarodan.popupAd.dismissed.old:1', String(NOW));
    await expect(filterDismissedPopupAds([legacy])).resolves.toEqual([]);
  });

  it('depolama okunamazsa elemez (hata "gösterme" demek değil)', async () => {
    mockGet.mockImplementationOnce(() => Promise.reject(new Error('storage unavailable')));
    const ad: Ad = { id: 'a' };
    await expect(filterDismissedPopupAds([ad])).resolves.toEqual([ad]);
  });
});
