/**
 * Popup reklam: 24 saat sıklığı (AsyncStorage), gecikme, engel (başka Modal),
 * reklamsız üye, ve iOS ModalFreeze — bağlantı modal KAPANDIKTAN sonra açılır.
 */
import React from 'react';
import * as fs from 'fs';
import * as path from 'path';
import { Dimensions, Modal as RNModal, StyleSheet } from 'react-native';
import { act, fireEvent, render } from '@testing-library/react-native';

const mockUseAds = jest.fn();
jest.mock('@/hooks/useAds', () => ({
  useAds: (position: string) => mockUseAds(position),
}));

jest.mock('@/lib/api', () => ({
  adsApi: { recordImpression: jest.fn(() => Promise.resolve()), recordClick: jest.fn(() => Promise.resolve()) },
}));

let mockInsets = { top: 0, right: 0, bottom: 0, left: 0 };
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: unknown }) => children,
  SafeAreaView: ({ children }: { children: unknown }) => children,
  useSafeAreaInsets: () => mockInsets,
}));

const mockCanShow = jest.fn();
const mockMark = jest.fn(() => Promise.resolve());
const mockClear = jest.fn(() => Promise.resolve());
jest.mock('@/lib/ads/popupFrequency', () => ({
  canShowPopupAd: () => mockCanShow(),
  markPopupAdShown: () => mockMark(),
  clearPopupAdShown: () => mockClear(),
}));

const mockPush = jest.fn();
jest.mock('expo-router', () => {
  const React = require('react');
  return {
    router: { push: (...a: unknown[]) => mockPush(...a) },
    useFocusEffect: (cb: () => void | (() => void)) => {
      React.useEffect(() => cb(), [cb]);
    },
  };
});

import { MODAL_CLOSE_HEADER_HEIGHT } from '@/ui';
import { PopupAd } from '../PopupAd';
import { POPUP_AD_DELAY_MS } from '@/lib/ads/usePopupAd';
import { NAVIGATE_AFTER_CLOSE_MS } from '../AdCreative';

const popupAd = {
  id: 'p1',
  title: 'Popup',
  imageUrl: null,
  linkUrl: '/secure-swap',
  content: 'Metin',
  altText: null,
  width: null,
  height: null,
  position: 'popup',
  deviceType: 'all',
};

const setAds = (ads: unknown[], isAdFree = false, limitsReady = true) =>
  mockUseAds.mockReturnValue({ ads, isAdFree, limitsReady, isLoading: false });

const setWindow = (width: number, height: number) =>
  Dimensions.set({ window: { width, height, scale: 2, fontScale: 1 }, screen: { width, height, scale: 2, fontScale: 1 } });

/** Gecikmeyi ve asenkron depo okumalarını işle. */
const flush = async (ms: number) => {
  await act(async () => {}); // depo okuması (cap) çözülsün, sayaç kurulsun
  await act(async () => {
    jest.advanceTimersByTime(ms);
  });
  await act(async () => {});
};

beforeEach(() => {
  jest.useFakeTimers();
  mockUseAds.mockReset();
  mockCanShow.mockReset().mockResolvedValue(true);
  mockMark.mockClear();
  mockClear.mockClear();
  mockPush.mockClear();
});
afterEach(() => jest.useRealTimers());

describe('PopupAd', () => {
  it('gecikmeden önce açılmaz; sonra açılır ve gösterim damgası atılır', async () => {
    setAds([popupAd]);
    const { queryByTestId } = render(<PopupAd />);
    await flush(POPUP_AD_DELAY_MS - 100);
    expect(queryByTestId('popup-ad')).toBeNull();
    await flush(200);
    expect(queryByTestId('popup-ad')).toBeTruthy();
    expect(mockMark).toHaveBeenCalledTimes(1);
  });

  it('24 saat dolmadıysa (depo "gösterme" derse) hiç açılmaz', async () => {
    mockCanShow.mockResolvedValue(false);
    setAds([popupAd]);
    const { queryByTestId } = render(<PopupAd />);
    await flush(POPUP_AD_DELAY_MS + 500);
    expect(queryByTestId('popup-ad')).toBeNull();
    expect(mockMark).not.toHaveBeenCalled();
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
    expect(mockMark).not.toHaveBeenCalled();
  });

  it('başka bir Modal açıkken (blocked) açılmaz; engel kalkınca sayaç yeniden başlar', async () => {
    setAds([popupAd]);
    const { queryByTestId, rerender } = render(<PopupAd blocked />);
    await flush(POPUP_AD_DELAY_MS + 500);
    expect(queryByTestId('popup-ad')).toBeNull();
    expect(mockMark).not.toHaveBeenCalled();

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
    expect(mockMark).not.toHaveBeenCalled();
  });

  it('X ile kapanır ve aynı oturumda yeniden açılmaz', async () => {
    setAds([popupAd]);
    const { queryByTestId, getByTestId } = render(<PopupAd />);
    await flush(POPUP_AD_DELAY_MS + 100);
    fireEvent.press(getByTestId('modal-close'));
    expect(queryByTestId('popup-ad')).toBeNull();
    await flush(POPUP_AD_DELAY_MS * 2);
    expect(queryByTestId('popup-ad')).toBeNull();
    expect(mockMark).toHaveBeenCalledTimes(1);
  });

  it('iOS ModalFreeze: reklama dokununca modal ÖNCE kapanır, bağlantı SONRA açılır', async () => {
    setAds([popupAd]);
    const { queryByTestId, getByTestId } = render(<PopupAd />);
    await flush(POPUP_AD_DELAY_MS + 100);

    fireEvent.press(getByTestId('ad-banner-p1'));
    expect(queryByTestId('popup-ad')).toBeNull(); // modal kapandı
    expect(mockPush).not.toHaveBeenCalled(); // ama gezinme henüz yok

    await flush(NAVIGATE_AFTER_CLOSE_MS + 10);
    expect(mockPush).toHaveBeenCalledWith('/guvenli-takas');
  });

  it('satın alma hedefli popup tıklanamaz (kapı)', async () => {
    setAds([{ ...popupAd, linkUrl: '/membership' }]);
    const { getByTestId } = render(<PopupAd />);
    await flush(POPUP_AD_DELAY_MS + 100);
    fireEvent.press(getByTestId('ad-banner-p1'));
    await flush(NAVIGATE_AFTER_CLOSE_MS + 10);
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('girişli üyede limitler (limitsReady) yüklenmeden aday seçilmez, sayaç başlamaz', async () => {
    setAds([popupAd], false, false);
    const { queryByTestId, rerender } = render(<PopupAd />);
    await flush(POPUP_AD_DELAY_MS * 2);
    expect(queryByTestId('popup-ad')).toBeNull();
    expect(mockMark).not.toHaveBeenCalled();

    // Limitler geldi (reklamsız değil): sayaç ŞİMDİ başlar, tam gecikme kadar bekler.
    setAds([popupAd], false, true);
    rerender(<PopupAd />);
    await flush(POPUP_AD_DELAY_MS - 200);
    expect(queryByTestId('popup-ad')).toBeNull();
    await flush(400);
    expect(queryByTestId('popup-ad')).toBeTruthy();
  });

  it('limitler reklamsız çıkarsa popup hiç açılmaz, damga yazılmaz', async () => {
    setAds([popupAd], false, false);
    const { queryByTestId, rerender } = render(<PopupAd />);
    await flush(POPUP_AD_DELAY_MS - 500);
    setAds([popupAd], true, true);
    rerender(<PopupAd />);
    await flush(POPUP_AD_DELAY_MS * 2);
    expect(queryByTestId('popup-ad')).toBeNull();
    expect(mockMark).not.toHaveBeenCalled();
  });

  it('popup açıkken isAdFree true olursa kapanır ve damga geri alınır', async () => {
    setAds([popupAd]);
    const { queryByTestId, rerender } = render(<PopupAd />);
    await flush(POPUP_AD_DELAY_MS + 100);
    expect(queryByTestId('popup-ad')).toBeTruthy();
    expect(mockMark).toHaveBeenCalledTimes(1);

    setAds([popupAd], true);
    rerender(<PopupAd />);
    await flush(10);
    expect(queryByTestId('popup-ad')).toBeNull();
    expect(mockClear).toHaveBeenCalledTimes(1);
    // Yeniden açılmaz.
    await flush(POPUP_AD_DELAY_MS * 2);
    expect(queryByTestId('popup-ad')).toBeNull();
  });

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

  it('web gibi Modal yüzeyi: lg boyut, beyaz kart, gövde iç boşluksuz, X başlık satırında', async () => {
    setAds([popupAd]);
    const { getByTestId, getByLabelText } = render(<PopupAd />);
    await flush(POPUP_AD_DELAY_MS + 100);
    // popup-ad -> gövde -> kart (sheet)
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
    expect(sheet?.backgroundColor).not.toBe('transparent'); // beyaz kart
    expect(sheet?.borderRadius).toBeGreaterThan(0);
    expect(body?.padding).toBe(0); // yalnız gövde iç boşluğu sıfır
    // Kapat düğmesi başlık satırında: reklam kutusunun (popup-ad) içinde DEĞİL.
    expect(getByLabelText('Kapat')).toBe(getByTestId('modal-close'));
    let inside = false;
    for (let n = getByTestId('modal-close').parent; n; n = n.parent) {
      if (n === getByTestId('popup-ad')) inside = true;
    }
    expect(inside).toBe(false);
  });

  describe('kart görsele oturur (iki yanda beyaz bant yok)', () => {
    const styleOf = (n: { props: { style?: unknown } }) =>
      StyleSheet.flatten(n.props.style as never) as Record<string, unknown> | undefined;
    /** Görsel kutusundan karta (sheet) kadar zincir: [kutu, ..., kart] stilleri. */
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
      setAds([{ ...popupAd, imageUrl: 'https://example.com/tall.png', content: null, linkUrl: null, width: 400, height: 800 }]);
      const { getByTestId } = render(<PopupAd />);
      await flush(POPUP_AD_DELAY_MS + 100);

      const box = getByTestId('ad-image-box-p1');
      const boxStyle = styleOf(box)!;
      expect(boxStyle.width as number).toBeLessThan(358); // dar: kartın tam genişliğinden küçük
      expect((boxStyle.width as number) / (boxStyle.height as number)).toBeCloseTo(0.5, 5);

      const chain = chainToSheet(box);
      const sheet = chain[chain.length - 1]!;
      expect(sheet.maxWidth).toBe(512);
      expect(sheet.width).toBe('auto'); // içeriğe oturur: tam genişlik ('100%') DEĞİL
      expect(sheet.backgroundColor).not.toBe('transparent'); // kart hâlâ beyaz
      // Kutu ile kart arasında yatay iç boşluk ya da sabit genişlik yok: bant oluşamaz.
      for (const st of chain.slice(1, -1)) {
        expect(st.padding ?? 0).toBe(0);
        expect(st.paddingHorizontal ?? 0).toBe(0);
        // (RN'de composite + host düğümü aynı stili taşır: kutunun kendi genişliği tekrar görünebilir.)
        expect([undefined, 'auto', boxStyle.width]).toContain(st.width);
      }
      // Başlıktaki kapat satırı korunur.
      expect(getByTestId('modal-close')).toBeTruthy();
    });

    it('metin reklam: kart tam genişlik kalır (içeriğe oturmaz)', async () => {
      setWindow(390, 844);
      setAds([popupAd]);
      const { getByTestId } = render(<PopupAd />);
      await flush(POPUP_AD_DELAY_MS + 100);
      const chain = chainToSheet(getByTestId('popup-ad'));
      expect(chain[chain.length - 1]!.width).toBe('100%');
    });
  });

  describe('boyut: ekranı taşırmaz, X her zaman görünür', () => {
    afterEach(() => {
      // Bileşen hâlâ bağlıyken pencere değişimi state güncellemesi sayılır.
      act(() => setWindow(750, 1334));
      mockInsets = { top: 0, right: 0, bottom: 0, left: 0 };
    });

    it('1:2 (dikey) reklam: kutu ekranın %80\'ine ve güvenli alana sığar, oran korunur', async () => {
      setWindow(390, 600);
      mockInsets = { top: 47, right: 0, bottom: 34, left: 0 };
      setAds([{ ...popupAd, imageUrl: 'https://example.com/tall.png', content: null, linkUrl: null, width: 400, height: 800 }]);
      const { getByTestId } = render(<PopupAd />);
      await flush(POPUP_AD_DELAY_MS + 100);

      const box = StyleSheet.flatten(getByTestId('ad-image-box-p1').props.style);
      // kart = min(%80 * 600, 600 - 47 - 34 - 32) = 480; gövde iç boşluksuz: kutu = kart - başlık satırı (48) = 432.
      expect(box.height).toBe(432);
      expect(box.width).toBe(216);
      expect(box.width / box.height).toBe(0.5);
      expect(box.height + MODAL_CLOSE_HEADER_HEIGHT).toBeLessThanOrEqual(600 * 0.8);
      // Kapat düğmesi başlık satırında (akışta, görselin üstüne binmez); kutu 432'yi aşmaz.
      expect(getByTestId('modal-close')).toBeTruthy();
      expect(getByTestId('popup-ad').props.style).toMatchObject({ maxHeight: 432 });
    });

    it('geniş reklam: genişlik kartın tamamına (390-32=358) sığar, oran korunur', async () => {
      setWindow(390, 844);
      setAds([{ ...popupAd, imageUrl: 'https://example.com/wide.png', content: null, linkUrl: null, width: 800, height: 400 }]);
      const { getByTestId } = render(<PopupAd />);
      await flush(POPUP_AD_DELAY_MS + 100);
      const box = StyleSheet.flatten(getByTestId('ad-image-box-p1').props.style);
      expect(box.width).toBe(358);
      expect(box.height).toBe(179);
    });
  });
});
