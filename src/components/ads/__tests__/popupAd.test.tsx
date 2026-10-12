/**
 * Popup reklam: 24 saat sıklığı (AsyncStorage), gecikme, engel (başka Modal),
 * reklamsız üye, ve iOS ModalFreeze — bağlantı modal KAPANDIKTAN sonra açılır.
 */
import React from 'react';
import * as fs from 'fs';
import * as path from 'path';
import { Modal as RNModal } from 'react-native';
import { act, fireEvent, render } from '@testing-library/react-native';

const mockUseAds = jest.fn();
jest.mock('@/hooks/useAds', () => ({
  useAds: (position: string) => mockUseAds(position),
}));

jest.mock('@/lib/api', () => ({
  adsApi: { recordImpression: jest.fn(() => Promise.resolve()), recordClick: jest.fn(() => Promise.resolve()) },
}));

const mockCanShow = jest.fn();
const mockMark = jest.fn(() => Promise.resolve());
jest.mock('@/lib/ads/popupFrequency', () => ({
  canShowPopupAd: () => mockCanShow(),
  markPopupAdShown: () => mockMark(),
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

const setAds = (ads: unknown[], isAdFree = false) =>
  mockUseAds.mockReturnValue({ ads, isAdFree, isLoading: false });

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
});
