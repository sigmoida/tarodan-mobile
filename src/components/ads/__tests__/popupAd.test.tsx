/**
 * Popup reklam: reklam başına sıklık (until_dismissed / every_visit + popupVersion),
 * ziyaret = ana sekmenin odak kazanması (arka plandan dönüş değil), gecikme, engel
 * (başka Modal), reklamsız üye, sade (media) yüzey, tek bölge → tüm görsel ve iOS
 * ModalFreeze — bağlantı modal KAPANDIKTAN sonra açılır.
 */
import React from 'react';
import * as fs from 'fs';
import * as path from 'path';
import { AppState, Dimensions, Modal as RNModal, StyleSheet } from 'react-native';
import { act, fireEvent, render } from '@testing-library/react-native';

const mockUseAds = jest.fn();
jest.mock('@/hooks/useAds', () => ({
  useAds: (position: string) => mockUseAds(position),
}));

const mockRecordClick = jest.fn((..._a: unknown[]) => Promise.resolve());
jest.mock('@/lib/api', () => ({
  adsApi: {
    recordImpression: jest.fn(() => Promise.resolve()),
    recordClick: (...a: unknown[]) => mockRecordClick(...a),
  },
}));

let mockInsets = { top: 0, right: 0, bottom: 0, left: 0 };
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: unknown }) => children,
  SafeAreaView: ({ children }: { children: unknown }) => children,
  useSafeAreaInsets: () => mockInsets,
}));

// Gerçek `popupFrequency` + bellek içi depo.
const mockStore = new Map<string, string>();
const mockSetItem = jest.fn((k: string, v: string) => {
  mockStore.set(k, v);
  return Promise.resolve();
});
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: (k: string) => Promise.resolve(mockStore.get(k) ?? null),
    setItem: (k: string, v: string) => mockSetItem(k, v),
    removeItem: (k: string) => {
      mockStore.delete(k);
      return Promise.resolve();
    },
  },
}));

// Denetlenebilir odak: `blurScreen` / `focusScreen` sekmeden çıkışı / dönüşü taklit eder.
type FocusEntry = { focus: () => void; blur: () => void };
const mockFocusEntries = new Set<FocusEntry>();
const mockPush = jest.fn();
jest.mock('expo-router', () => {
  const React = require('react');
  return {
    router: { push: (...a: unknown[]) => mockPush(...a) },
    useFocusEffect: (cb: () => void | (() => void)) => {
      React.useEffect(() => {
        let cleanup = cb();
        const entry = {
          focus: () => {
            cleanup = cb();
          },
          blur: () => {
            if (typeof cleanup === 'function') cleanup();
            cleanup = undefined;
          },
        };
        mockFocusEntries.add(entry);
        return () => {
          mockFocusEntries.delete(entry);
          if (typeof cleanup === 'function') cleanup();
        };
      }, [cb]);
    },
  };
});

import { PopupAd } from '../PopupAd';
import { POPUP_AD_DELAY_MS, POPUP_LINK_RETURN_WINDOW_MS } from '@/lib/ads/usePopupAd';
import { POPUP_AD_STORAGE_KEY, resetPopupFrequencyMemoryForTests } from '@/lib/ads/popupFrequency';
import { NAVIGATE_AFTER_CLOSE_MS } from '../AdCreative';
import { theme } from '@/ui';

const popupAd = {
  id: 'p1',
  title: 'Popup',
  imageUrl: null as string | null,
  linkUrl: '/manufacturers' as string | null,
  content: 'Metin' as string | null,
  altText: null,
  width: null as number | null,
  height: null as number | null,
  position: 'popup',
  deviceType: 'all',
  popupFrequency: 'until_dismissed' as 'until_dismissed' | 'every_visit',
  popupVersion: 1,
};
/** Eski API yanıtı: sıklık/sürüm alanları yok. */
const { popupFrequency: _f, popupVersion: _v, ...legacyAd } = popupAd;
const imageAd = { ...popupAd, imageUrl: 'https://example.com/a.png', content: null, linkUrl: null, width: 800, height: 400 };
const hotspot = (id: string, linkUrl: string, x = 0) => ({
  id,
  x,
  y: 0,
  width: 0.5,
  height: 0.5,
  label: `Bölge ${id}`,
  linkUrl,
  sortOrder: 0,
});

const setAds = (ads: unknown[], isAdFree = false, limitsReady = true) =>
  mockUseAds.mockReturnValue({ ads, isAdFree, limitsReady, isLoading: false });

const setWindow = (width: number, height: number) =>
  Dimensions.set({ window: { width, height, scale: 2, fontScale: 1 }, screen: { width, height, scale: 2, fontScale: 1 } });

const dismissedKeys = () => [...mockStore.keys()].filter((k) => k.startsWith('tarodan.popupAd.dismissed.'));

/** Gecikmeyi ve asenkron depo okumalarını işle. */
const flush = async (ms: number) => {
  await act(async () => {});
  await act(async () => {
    jest.advanceTimersByTime(ms);
  });
  await act(async () => {});
};
const blurScreen = () => act(() => mockFocusEntries.forEach((e) => e.blur()));
const focusScreen = () => act(() => mockFocusEntries.forEach((e) => e.focus()));

let appStateHandlers: Array<(s: string) => void> = [];
const setAppState = (s: string) => act(() => appStateHandlers.forEach((h) => h(s)));

beforeEach(() => {
  jest.useFakeTimers();
  mockUseAds.mockReset();
  mockStore.clear();
  resetPopupFrequencyMemoryForTests();
  mockSetItem.mockClear();
  mockPush.mockClear();
  mockRecordClick.mockClear();
  appStateHandlers = [];
  jest.spyOn(AppState, 'addEventListener').mockImplementation(((_type: string, h: (s: string) => void) => {
    appStateHandlers.push(h);
    return { remove: jest.fn() };
  }) as never);
});
afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('PopupAd — açılış', () => {
  it('gecikmeden önce açılmaz; sonra açılır; gösterimde hiçbir şey yazılmaz', async () => {
    setAds([popupAd]);
    const { queryByTestId } = render(<PopupAd />);
    await flush(POPUP_AD_DELAY_MS - 100);
    expect(queryByTestId('popup-ad')).toBeNull();
    await flush(200);
    expect(queryByTestId('popup-ad')).toBeTruthy();
    expect(mockSetItem).not.toHaveBeenCalled();
  });

  it('reklam yoksa ya da üye reklamsızsa açılmaz', async () => {
    setAds([]);
    const a = render(<PopupAd />);
    await flush(POPUP_AD_DELAY_MS + 500);
    expect(a.queryByTestId('popup-ad')).toBeNull();
    a.unmount();

    setAds([popupAd], true);
    const b = render(<PopupAd />);
    await flush(POPUP_AD_DELAY_MS + 500);
    expect(b.queryByTestId('popup-ad')).toBeNull();
  });

  it('başka bir Modal açıkken (blocked) açılmaz; engel kalkınca sayaç yeniden başlar', async () => {
    setAds([popupAd]);
    const { queryByTestId, rerender } = render(<PopupAd blocked />);
    await flush(POPUP_AD_DELAY_MS + 500);
    expect(queryByTestId('popup-ad')).toBeNull();

    rerender(<PopupAd blocked={false} />);
    await flush(POPUP_AD_DELAY_MS + 100);
    expect(queryByTestId('popup-ad')).toBeTruthy();
  });

  it('gecikme sırasında engel çıkarsa açılmaz', async () => {
    setAds([popupAd]);
    const { queryByTestId, rerender } = render(<PopupAd />);
    await flush(POPUP_AD_DELAY_MS - 500);
    rerender(<PopupAd blocked />);
    await flush(1000);
    expect(queryByTestId('popup-ad')).toBeNull();
  });

  it('girişli üyede limitler (limitsReady) yüklenmeden sayaç başlamaz', async () => {
    setAds([popupAd], false, false);
    const { queryByTestId, rerender } = render(<PopupAd />);
    await flush(POPUP_AD_DELAY_MS * 2);
    expect(queryByTestId('popup-ad')).toBeNull();

    // Limitler geldi (reklamsız değil): sayaç ŞİMDİ başlar, tam gecikme kadar bekler.
    setAds([popupAd], false, true);
    rerender(<PopupAd />);
    await flush(POPUP_AD_DELAY_MS - 200);
    expect(queryByTestId('popup-ad')).toBeNull();
    await flush(400);
    expect(queryByTestId('popup-ad')).toBeTruthy();
  });

  it('limitler reklamsız çıkarsa popup hiç açılmaz', async () => {
    setAds([popupAd], false, false);
    const { queryByTestId, rerender } = render(<PopupAd />);
    await flush(POPUP_AD_DELAY_MS - 500);
    setAds([popupAd], true, true);
    rerender(<PopupAd />);
    await flush(POPUP_AD_DELAY_MS * 2);
    expect(queryByTestId('popup-ad')).toBeNull();
  });

  it('popup açıkken isAdFree true olursa kapanır; kullanıcı kapatmadığı için "kapatıldı" YAZILMAZ', async () => {
    setAds([popupAd]);
    const { queryByTestId, rerender } = render(<PopupAd />);
    await flush(POPUP_AD_DELAY_MS + 100);
    expect(queryByTestId('popup-ad')).toBeTruthy();

    setAds([popupAd], true);
    rerender(<PopupAd />);
    await flush(10);
    expect(queryByTestId('popup-ad')).toBeNull();
    expect(dismissedKeys()).toEqual([]);
    await flush(POPUP_AD_DELAY_MS * 2);
    expect(queryByTestId('popup-ad')).toBeNull();
  });
});

describe('PopupAd — sıklık (reklam başına)', () => {
  it('until_dismissed: X ile kapanınca anahtar yazılır, sonraki ziyarette çıkmaz', async () => {
    setAds([popupAd]);
    const { queryByTestId, getByTestId } = render(<PopupAd />);
    await flush(POPUP_AD_DELAY_MS + 100);
    fireEvent.press(getByTestId('modal-close'));
    expect(queryByTestId('popup-ad')).toBeNull();
    await flush(0);
    expect(dismissedKeys()).toEqual(['tarodan.popupAd.dismissed.p1:1']);

    blurScreen();
    focusScreen();
    await flush(POPUP_AD_DELAY_MS * 2);
    expect(queryByTestId('popup-ad')).toBeNull();
  });

  it('until_dismissed: kapatılmamışsa her ziyarette yeniden değerlendirilir (soğuk açılışta kapatılmışsa hiç çıkmaz)', async () => {
    mockStore.set('tarodan.popupAd.dismissed.p1:3', '1');
    setAds([{ ...popupAd, popupFrequency: 'until_dismissed', popupVersion: 3 }]);
    const { queryByTestId, rerender } = render(<PopupAd />);
    await flush(POPUP_AD_DELAY_MS + 100);
    expect(queryByTestId('popup-ad')).toBeNull();

    // Sürüm arttı → anahtar farklı → yeni ziyarette yeniden çıkar.
    setAds([{ ...popupAd, popupFrequency: 'until_dismissed', popupVersion: 4 }]);
    rerender(<PopupAd />);
    blurScreen();
    focusScreen();
    await flush(POPUP_AD_DELAY_MS + 100);
    expect(queryByTestId('popup-ad')).toBeTruthy();
  });

  it('kapatılmış reklamlar pickAd\'den ÖNCE elenir: kalan reklam her zaman seçilir', async () => {
    mockStore.set('tarodan.popupAd.dismissed.p1:1', '1');
    for (let i = 0; i < 5; i += 1) {
      setAds([popupAd, { ...popupAd, id: 'p2', title: 'İkinci' }]);
      const r = render(<PopupAd />);
      await flush(POPUP_AD_DELAY_MS + 100);
      expect(r.getByTestId('ad-banner-p2')).toBeTruthy();
      expect(r.queryByTestId('ad-banner-p1')).toBeNull();
      r.unmount();
    }
  });

  it('every_visit: kapatınca hiçbir şey yazılmaz; sekmeye dönüşte (odak) yeniden gösterilir', async () => {
    setAds([{ ...popupAd, popupFrequency: 'every_visit', popupVersion: 1 }]);
    const { queryByTestId, getByTestId } = render(<PopupAd />);
    await flush(POPUP_AD_DELAY_MS + 100);
    fireEvent.press(getByTestId('modal-close'));
    await flush(POPUP_AD_DELAY_MS * 2);
    expect(queryByTestId('popup-ad')).toBeNull(); // aynı ziyarette yeniden yok
    expect(mockSetItem).not.toHaveBeenCalled();

    blurScreen();
    await flush(POPUP_AD_DELAY_MS * 2);
    expect(queryByTestId('popup-ad')).toBeNull(); // odakta değilken açılmaz
    focusScreen();
    await flush(POPUP_AD_DELAY_MS - 200);
    expect(queryByTestId('popup-ad')).toBeNull();
    await flush(400);
    expect(queryByTestId('popup-ad')).toBeTruthy();
    expect(mockSetItem).not.toHaveBeenCalled();
  });

  it('every_visit: uygulama arka plandan öne gelince yeniden GÖSTERİLMEZ', async () => {
    setAds([{ ...popupAd, popupFrequency: 'every_visit', popupVersion: 1 }]);
    const { queryByTestId, getByTestId } = render(<PopupAd />);
    await flush(POPUP_AD_DELAY_MS + 100);
    fireEvent.press(getByTestId('modal-close'));

    expect(appStateHandlers.length).toBeGreaterThan(0); // useScreenActive dinliyor
    setAppState('background');
    await flush(1000);
    setAppState('active');
    await flush(POPUP_AD_DELAY_MS * 2);
    expect(queryByTestId('popup-ad')).toBeNull();
  });

  it('reklama dokunmak da kullanıcı kapatmasıdır (until_dismissed anahtarı yazılır)', async () => {
    setAds([popupAd]);
    const { getByTestId } = render(<PopupAd />);
    await flush(POPUP_AD_DELAY_MS + 100);
    fireEvent.press(getByTestId('ad-banner-p1'));
    await flush(NAVIGATE_AFTER_CLOSE_MS + 10);
    expect(dismissedKeys()).toEqual(['tarodan.popupAd.dismissed.p1:1']);
  });
});

describe('PopupAd — popup bağlantısından dönüş', () => {
  const everyVisit = { ...popupAd, popupFrequency: 'every_visit' as const };

  it('every_visit: popup\'ın açtığı bağlantıdan geri dönüş yeni ziyaret sayılmaz; sonraki gerçek dönüş sayılır', async () => {
    setAds([everyVisit]);
    const { queryByTestId, getByTestId } = render(<PopupAd />);
    await flush(POPUP_AD_DELAY_MS + 100);
    fireEvent.press(getByTestId('ad-banner-p1'));
    await flush(NAVIGATE_AFTER_CLOSE_MS + 10);
    expect(mockPush).toHaveBeenCalled();
    // Bağlantı hedefi açıldı (ana sekme odağı kaybetti) → geri gelindi.
    blurScreen();
    focusScreen();
    await flush(POPUP_AD_DELAY_MS * 2);
    expect(queryByTestId('popup-ad')).toBeNull();

    // Kullanıcı başka bir ekrana gidip döner: yeni ziyaret.
    blurScreen();
    focusScreen();
    await flush(POPUP_AD_DELAY_MS + 100);
    expect(queryByTestId('popup-ad')).toBeTruthy();
  });

  it('bağlantı odak kaybettirmediyse (hedef ana sekme) bayrak süre dolunca düşer, sonraki ziyareti yutmaz', async () => {
    setAds([everyVisit]);
    const { queryByTestId, getByTestId } = render(<PopupAd />);
    await flush(POPUP_AD_DELAY_MS + 100);
    fireEvent.press(getByTestId('ad-banner-p1'));
    await flush(POPUP_LINK_RETURN_WINDOW_MS + 100);
    blurScreen();
    focusScreen();
    await flush(POPUP_AD_DELAY_MS + 100);
    expect(queryByTestId('popup-ad')).toBeTruthy();
  });
});

describe('PopupAd — açıkken engel (iOS: iki sunum aynı anda yok)', () => {
  it('açıkken blocked olursa aynı render\'da gizlenir, "kapatıldı" yazılmaz, bu ziyarette yeniden açılmaz', async () => {
    setAds([popupAd]);
    const { queryByTestId, rerender } = render(<PopupAd />);
    await flush(POPUP_AD_DELAY_MS + 100);
    expect(queryByTestId('popup-ad')).toBeTruthy();
    rerender(<PopupAd blocked />);
    expect(queryByTestId('popup-ad')).toBeNull();
    await flush(10);
    rerender(<PopupAd />);
    await flush(POPUP_AD_DELAY_MS * 2);
    expect(queryByTestId('popup-ad')).toBeNull();
    expect(dismissedKeys()).toEqual([]);
  });
});

describe('PopupAd — eski API (sıklık/sürüm alanı yok): global 24 saat', () => {
  it('gösterimde eski damga yazılır, reklam anahtarı yazılmaz; damga varken sonraki ziyarette çıkmaz', async () => {
    setAds([legacyAd]);
    const { queryByTestId, getByTestId } = render(<PopupAd />);
    await flush(POPUP_AD_DELAY_MS + 100);
    expect(queryByTestId('popup-ad')).toBeTruthy();
    expect(mockStore.has(POPUP_AD_STORAGE_KEY)).toBe(true);
    fireEvent.press(getByTestId('modal-close'));
    await flush(0);
    expect(dismissedKeys()).toEqual([]);

    blurScreen();
    focusScreen();
    await flush(POPUP_AD_DELAY_MS * 2);
    expect(queryByTestId('popup-ad')).toBeNull();
  });

  it('24 saat dolmadıysa hiç açılmaz', async () => {
    mockStore.set(POPUP_AD_STORAGE_KEY, String(Date.now()));
    setAds([legacyAd]);
    const { queryByTestId } = render(<PopupAd />);
    await flush(POPUP_AD_DELAY_MS + 500);
    expect(queryByTestId('popup-ad')).toBeNull();
  });

  it('açıkken üye reklamsız çıkarsa damga geri alınır', async () => {
    setAds([legacyAd]);
    const { rerender } = render(<PopupAd />);
    await flush(POPUP_AD_DELAY_MS + 100);
    expect(mockStore.has(POPUP_AD_STORAGE_KEY)).toBe(true);
    setAds([legacyAd], true);
    rerender(<PopupAd />);
    await flush(10);
    expect(mockStore.has(POPUP_AD_STORAGE_KEY)).toBe(false);
  });

  it('yeni alanlar gelince eski damga bir kez silinir ve yeni mantık uygulanır', async () => {
    mockStore.set(POPUP_AD_STORAGE_KEY, String(Date.now()));
    setAds([popupAd]);
    const { queryByTestId } = render(<PopupAd />);
    await flush(POPUP_AD_DELAY_MS + 100);
    expect(queryByTestId('popup-ad')).toBeTruthy();
    expect(mockStore.has(POPUP_AD_STORAGE_KEY)).toBe(false);
  });
});

describe('PopupAd — tıklama', () => {
  it('iOS ModalFreeze: reklama dokununca modal ÖNCE kapanır, bağlantı SONRA açılır', async () => {
    setAds([popupAd]);
    const { queryByTestId, getByTestId } = render(<PopupAd />);
    await flush(POPUP_AD_DELAY_MS + 100);

    fireEvent.press(getByTestId('ad-banner-p1'));
    expect(queryByTestId('popup-ad')).toBeNull(); // modal kapandı
    expect(mockPush).not.toHaveBeenCalled(); // ama gezinme henüz yok

    await flush(NAVIGATE_AFTER_CLOSE_MS + 10);
    expect(mockPush).toHaveBeenCalledWith('/ureticiler');
  });

  it('satın alma hedefli popup tıklanamaz (kapı)', async () => {
    setAds([{ ...popupAd, linkUrl: '/membership' }]);
    const { getByTestId } = render(<PopupAd />);
    await flush(POPUP_AD_DELAY_MS + 100);
    fireEvent.press(getByTestId('ad-banner-p1'));
    await flush(NAVIGATE_AFTER_CLOSE_MS + 10);
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('tek bölge: TÜM görsel tıklanır → recordClick(id, bölge) + önce kapat, sonra aç', async () => {
    setAds([{ ...imageAd, hotspots: [hotspot('h1', '/manufacturers')] }]);
    const { getByTestId, queryByTestId } = render(<PopupAd />);
    await flush(POPUP_AD_DELAY_MS + 100);
    expect(queryByTestId('ad-hotspot-h1')).toBeNull(); // küçük bölge çizilmez
    const whole = getByTestId('ad-banner-p1');
    expect(whole.props.accessibilityRole).toBe('link');

    fireEvent.press(whole);
    expect(mockRecordClick).toHaveBeenCalledWith('p1', 'h1');
    expect(queryByTestId('popup-ad')).toBeNull();
    expect(mockPush).not.toHaveBeenCalled();
    await flush(NAVIGATE_AFTER_CLOSE_MS + 10);
    expect(mockPush).toHaveBeenCalledWith('/ureticiler');
  });

  it('tek bölge satın almaya gidiyorsa görsel tıklanamaz', async () => {
    setAds([{ ...imageAd, hotspots: [hotspot('h1', '/membership')] }]);
    const { getByTestId, queryByTestId } = render(<PopupAd />);
    await flush(POPUP_AD_DELAY_MS + 100);
    const whole = getByTestId('ad-banner-p1');
    expect(whole.props.accessibilityRole).toBe('image');
    expect(queryByTestId('ad-hotspot-h1')).toBeNull();
    fireEvent.press(whole);
    await flush(NAVIGATE_AFTER_CLOSE_MS + 10);
    expect(mockRecordClick).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('birden çok bölge: bölgeler aynen çizilir, görselin tamamı tıklanmaz', async () => {
    setAds([{ ...imageAd, hotspots: [hotspot('h1', '/manufacturers'), hotspot('h2', '/cart', 0.5)] }]);
    const { getByTestId } = render(<PopupAd />);
    await flush(POPUP_AD_DELAY_MS + 100);
    expect(getByTestId('ad-hotspot-h1')).toBeTruthy();
    expect(getByTestId('ad-hotspot-h2')).toBeTruthy();
    // Görselin tamamı bağlantı değil (yalnız bölgeler tıklanır).
    expect(getByTestId('ad-banner-p1').props.accessibilityRole).toBe('image');

    fireEvent.press(getByTestId('ad-hotspot-h1'));
    expect(mockRecordClick).toHaveBeenCalledWith('p1', 'h1');
  });
});

describe('PopupAd — yüzey', () => {
  it('@/ui Modal kullanır (ham RN Modal içe aktarılmaz) ve Android geri tuşu kapatır', async () => {
    const src = fs.readFileSync(path.resolve(__dirname, '../PopupAd.tsx'), 'utf8');
    expect(src).toMatch(/import \{[^}]*\bModal\b[^}]*\} from '@\/ui'/);
    expect(src).not.toMatch(/Modal[^;]*from 'react-native'/);

    setAds([popupAd]);
    const { queryByTestId, UNSAFE_getByType } = render(<PopupAd />);
    await flush(POPUP_AD_DELAY_MS + 100);
    expect(queryByTestId('popup-ad')).toBeTruthy();
    act(() => UNSAFE_getByType(RNModal).props.onRequestClose());
    expect(queryByTestId('popup-ad')).toBeNull();
  });

  it('metin reklam: mevcut yüzey — lg, beyaz kart, gövde iç boşluksuz, X başlık satırında', async () => {
    setAds([popupAd]);
    const { getByTestId, getByLabelText } = render(<PopupAd />);
    await flush(POPUP_AD_DELAY_MS + 100);
    let node = getByTestId('popup-ad').parent;
    let body: Record<string, unknown> | undefined;
    let sheet: Record<string, unknown> | undefined;
    while (node && !sheet) {
      const st = StyleSheet.flatten(node.props.style);
      if (st && st.maxWidth) sheet = st;
      else if (st && 'padding' in st && !body) body = st;
      node = node.parent;
    }
    expect(sheet?.maxWidth).toBe(512); // lg
    expect(sheet?.width).toBe('100%'); // metin reklam kartın tam genişliği
    expect(body?.padding).toBe(0);
    // Metin popup önceki alt boşluğunu korur (dikey sıfırlama yalnız görselli media kartında).
    expect(body?.paddingBottom ?? body?.paddingVertical).toBe(theme.spacing[5]);
    expect(getByLabelText('Kapat')).toBe(getByTestId('modal-close'));
    let inside = false;
    for (let n = getByTestId('modal-close').parent; n; n = n.parent) {
      if (n === getByTestId('popup-ad')) inside = true;
    }
    expect(inside).toBe(false);
  });

  it('görselli reklam: sade (media) — başlık satırı yok, X görselin üstünde sağ üstte (cam düğme, "Kapat")', async () => {
    setWindow(390, 844);
    setAds([imageAd]);
    const { getByTestId, getByLabelText } = render(<PopupAd />);
    await flush(POPUP_AD_DELAY_MS + 100);
    const close = getByTestId('modal-close');
    expect(getByLabelText('Kapat')).toBe(close);
    // X'in sarmalayıcısı mutlak konumlu ve sağ üstte; kartın (maxWidth 512) içinde.
    let overlay: Record<string, unknown> | undefined;
    let inSheet = false;
    type Node = { parent: Node | null; props: { style?: unknown } };
    for (let n = close.parent as Node | null; n; n = n.parent) {
      const st = StyleSheet.flatten(n.props.style as never) as Record<string, unknown> | undefined;
      if (!overlay && st?.position === 'absolute' && 'right' in st) overlay = st;
      if (st?.maxWidth === 512) inSheet = true;
    }
    expect(overlay).toMatchObject({ position: 'absolute' });
    expect(overlay!.top).toBeDefined();
    expect(inSheet).toBe(true);
    // Görsel kartın ilk içeriği: başlık satırı yok (kutu kartın en üstünde başlar).
    const box = StyleSheet.flatten(getByTestId('ad-image-box-p1').props.style);
    expect(box.width).toBe(358);
    expect(box.height).toBe(179);
    act(() => setWindow(750, 1334));
  });

  it('modalın erişilebilir adı reklam başlığı; media\'da X içerikten önce (ekran okuyucu sırası)', async () => {
    setAds([imageAd]);
    const { getByTestId, getAllByLabelText } = render(<PopupAd />);
    await flush(POPUP_AD_DELAY_MS + 100);
    // Kart (sheet) reklam başlığıyla adlandırılır ve modal kapsamıdır.
    const sheet = getAllByLabelText('Popup', { exact: true }).find((n) => n.props.accessibilityViewIsModal);
    expect(sheet).toBeTruthy();
    // Belge sırası: X'in sarmalayıcısı, reklam gövdesinden önce gelen kardeş.
    const order: string[] = [];
    type TreeNode = { props?: { testID?: string }; children?: unknown[] };
    const walk = (n: TreeNode) => {
      if (n.props?.testID === 'modal-close') order.push('close');
      if (n.props?.testID === 'popup-ad') order.push('content');
      (n.children ?? []).forEach((c) => {
        if (typeof c === 'object' && c !== null) walk(c as TreeNode);
      });
    };
    walk(sheet as unknown as TreeNode);
    // (Bileşen + host düğümü aynı testID'yi taşır: ardışık tekrarlar tek sayılır.)
    expect(order.filter((x, i) => x !== order[i - 1])).toEqual(['close', 'content']);
    expect(getByTestId('modal-close')).toBeTruthy();
  });

  it('geniş reklam: genişlik kartın tamamına (390-32=358) sığar, oran korunur', async () => {
    setWindow(390, 844);
    setAds([imageAd]);
    const { getByTestId } = render(<PopupAd />);
    await flush(POPUP_AD_DELAY_MS + 100);
    const box = StyleSheet.flatten(getByTestId('ad-image-box-p1').props.style);
    expect(box.width).toBe(358);
    expect(box.height).toBe(179);
    act(() => setWindow(750, 1334));
  });

  it('metin reklam: kart tam genişlik kalır (içeriğe oturmaz)', async () => {
    setWindow(390, 844);
    setAds([popupAd]);
    const { getByTestId } = render(<PopupAd />);
    await flush(POPUP_AD_DELAY_MS + 100);
    let sheet: Record<string, unknown> | undefined;
    for (let n = getByTestId('popup-ad').parent; n && !sheet; n = n.parent) {
      const st = StyleSheet.flatten(n.props.style) as Record<string, unknown> | undefined;
      if (st?.maxWidth === 512) sheet = st;
    }
    expect(sheet?.width).toBe('100%');
    act(() => setWindow(750, 1334));
  });

  describe('kart görsele oturur (iki yanda beyaz bant yok)', () => {
    const styleOf = (n: { props: { style?: unknown } }) =>
      StyleSheet.flatten(n.props.style as never) as Record<string, unknown> | undefined;
    const chainToSheet = (box: unknown) => {
      const chain: Record<string, unknown>[] = [];
      for (let n: any = box; n; n = n.parent) {
        const st = styleOf(n);
        if (st) chain.push(st);
        if (st && st.maxWidth === 512) break;
      }
      return chain;
    };
    afterEach(() => act(() => setWindow(750, 1334)));

    it('1:2 dikey reklam: kart içeriğe oturur (width auto), arada yatay boşluk/sabit genişlik yok', async () => {
      setWindow(390, 844);
      setAds([{ ...imageAd, width: 400, height: 800 }]);
      const { getByTestId } = render(<PopupAd />);
      await flush(POPUP_AD_DELAY_MS + 100);

      const box = getByTestId('ad-image-box-p1');
      const boxStyle = styleOf(box)!;
      expect(boxStyle.width as number).toBeLessThan(358);
      expect((boxStyle.width as number) / (boxStyle.height as number)).toBeCloseTo(0.5, 5);

      const chain = chainToSheet(box);
      const sheet = chain[chain.length - 1]!;
      expect(sheet.maxWidth).toBe(512);
      expect(sheet.width).toBe('auto');
      for (const st of chain.slice(1, -1)) {
        expect(st.padding ?? 0).toBe(0);
        expect(st.paddingHorizontal ?? 0).toBe(0);
        expect([undefined, 'auto', boxStyle.width]).toContain(st.width);
      }
      expect(getByTestId('modal-close')).toBeTruthy();
    });

    // Gövde stili `padding: 0` verip `paddingVertical`'ı sıfırlamıyordu: RN'de `paddingVertical`
    // `padding`'den özgül olduğundan görselin üstünde/altında 20pt bant kalıyordu.
    it.each([
      ['dikey 1:2', 400, 800],
      ['geniş 2:1', 800, 400],
    ])('%s: görsel kartın üst/alt kenarına yapışık — kutu ile kart arasında dikey boşluk yok', async (_n, w, h) => {
      setWindow(390, 844);
      setAds([{ ...imageAd, width: w, height: h }]);
      const { getByTestId } = render(<PopupAd />);
      await flush(POPUP_AD_DELAY_MS + 100);

      const box = getByTestId('ad-image-box-p1');
      const boxStyle = styleOf(box)!;
      expect((boxStyle.width as number) / (boxStyle.height as number)).toBeCloseTo(w / h, 5);
      const chain = chainToSheet(box);
      expect(chain[chain.length - 1]!.maxWidth).toBe(512);
      for (const st of chain.slice(1)) {
        for (const k of ['padding', 'paddingVertical', 'paddingTop', 'paddingBottom', 'margin', 'marginVertical', 'marginTop', 'marginBottom']) {
          expect([k, st[k] ?? 0]).toEqual([k, 0]);
        }
      }
    });
  });

  describe('boyut: ekranı taşırmaz, X her zaman görünür', () => {
    afterEach(() => {
      act(() => setWindow(750, 1334));
      mockInsets = { top: 0, right: 0, bottom: 0, left: 0 };
    });

    it('1:2 (dikey) reklam: görsel kartın tamamı — ekranın %80\'ine ve güvenli alana sığar, oran korunur', async () => {
      setWindow(390, 600);
      mockInsets = { top: 47, right: 0, bottom: 34, left: 0 };
      setAds([{ ...imageAd, width: 400, height: 800 }]);
      const { getByTestId } = render(<PopupAd />);
      await flush(POPUP_AD_DELAY_MS + 100);

      const box = StyleSheet.flatten(getByTestId('ad-image-box-p1').props.style);
      // kart = min(%80 * 600, 600 - 47 - 34 - 32) = 480; başlık satırı yok → kutu = 480.
      expect(box.height).toBe(480);
      expect(box.width).toBe(240);
      expect(getByTestId('modal-close')).toBeTruthy();
      expect(getByTestId('popup-ad').props.style).toMatchObject({ maxHeight: 480 });
    });
  });
});
