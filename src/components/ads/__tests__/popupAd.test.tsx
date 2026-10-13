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
    fireEvent.press(getByTestId('popup-ad-close'));
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

  it('bare Modal: beyaz kart zemini ve iç boşluk yok, kenardan kenara', async () => {
    setAds([popupAd]);
    const { getByTestId } = render(<PopupAd />);
    await flush(POPUP_AD_DELAY_MS + 100);
    // popup-ad -> sheet (Pressable) -> backdrop
    let node = getByTestId('popup-ad').parent;
    let sheet: Record<string, unknown> | undefined;
    while (node && !sheet) {
      const st = StyleSheet.flatten(node.props.style);
      if (st && st.maxWidth === 480) sheet = st;
      node = node.parent;
    }
    expect(sheet).toBeDefined();
    expect(sheet?.padding).toBe(0);
    expect(sheet?.backgroundColor).toBe('transparent');
  });

  describe('boyut: ekranı taşırmaz, X her zaman görünür', () => {
    const setWindow = (width: number, height: number) =>
      Dimensions.set({ window: { width, height, scale: 2, fontScale: 1 }, screen: { width, height, scale: 2, fontScale: 1 } });
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
      // kart = min(%80 * 600, 600 - 47 - 34 - 32) = 480; bare kartta iç boşluk yok, kutu = 480.
      expect(box.height).toBe(480);
      expect(box.width).toBe(240);
      expect(box.width / box.height).toBe(0.5);
      expect(box.height).toBeLessThanOrEqual(600 * 0.8);
      // Kapat düğmesi çizili ve kartın kendi köşesine mutlak yerleşik (akışın dışında).
      const close = getByTestId('popup-ad-close');
      expect(StyleSheet.flatten(close.props.style)).toMatchObject({ position: 'absolute' });
      expect(getByTestId('popup-ad').props.style).toMatchObject({ maxHeight: 480, alignSelf: 'center' });
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
