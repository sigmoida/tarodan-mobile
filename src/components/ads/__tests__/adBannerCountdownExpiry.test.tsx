/**
 * AdBanner — flaş geri sayım süre dolunca zamanlayıcıyı bırakır; gösterilecek
 * kod/geri sayım yoksa boş çip kapsayıcısı çizilmez.
 */
import React from 'react';
import { act, render } from '@testing-library/react-native';

const mockUseAds = jest.fn();
jest.mock('@/hooks/useAds', () => ({
  useAds: (position: string) => mockUseAds(position),
}));

jest.mock('@/lib/api', () => ({
  adsApi: { recordImpression: jest.fn(() => Promise.resolve()), recordClick: jest.fn(() => Promise.resolve()) },
}));

jest.mock('expo-router', () => ({ router: { push: jest.fn() }, useFocusEffect: () => undefined }));

import { AdBanner } from '../AdBanner';

const setAd = (campaign: Record<string, unknown> | null) =>
  mockUseAds.mockReturnValue({
    ads: [
      {
        id: 'ad-1', title: 'Flaş', imageUrl: null, linkUrl: null, content: null, altText: null,
        width: null, height: null, position: 'header', deviceType: 'all', campaign,
      },
    ],
    isAdFree: false,
    isLoading: false,
  });

const flash = (over: Record<string, unknown>) => ({
  id: 'c', name: 'K', code: null, target: 'all', isFlashSale: true, ...over,
});

describe('AdBanner — geri sayım bitişi', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('süre dolunca çip kalkar ve zamanlayıcı temizlenir', () => {
    setAd(flash({ endsAt: new Date(Date.now() + 2500).toISOString() }));
    const { queryByTestId } = render(<AdBanner />);
    expect(queryByTestId('ad-flash-countdown')).toBeTruthy();

    act(() => {
      jest.advanceTimersByTime(3000);
    });
    expect(queryByTestId('ad-flash-countdown')).toBeNull();
    // Reklam gösterim zamanlayıcısı da bitmiş olmalı; geri sayım interval'ı kalmamalı.
    act(() => {
      jest.advanceTimersByTime(5000);
    });
    expect(jest.getTimerCount()).toBe(0);
  });

  it('kod yok + geri sayım bitti → boş çip kapsayıcısı çizilmez', () => {
    setAd(flash({ endsAt: new Date(Date.now() - 1000).toISOString() }));
    const { queryByTestId } = render(<AdBanner />);
    expect(queryByTestId('ad-chips')).toBeNull();
    expect(queryByTestId('ad-flash-countdown')).toBeNull();
  });

  it('kod varsa geri sayım bitse de yalnız kod çipi kalır', () => {
    setAd(flash({ code: 'KOD10', endsAt: new Date(Date.now() - 1000).toISOString() }));
    const { queryByTestId, getByText } = render(<AdBanner />);
    expect(queryByTestId('ad-chips')).toBeTruthy();
    expect(queryByTestId('ad-flash-countdown')).toBeNull();
    expect(getByText('KOD10')).toBeTruthy();
  });

  it('kampanya yoksa kapsayıcı yok', () => {
    setAd(null);
    expect(render(<AdBanner />).queryByTestId('ad-chips')).toBeNull();
  });
});
