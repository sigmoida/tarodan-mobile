/**
 * AdBanner — tıklanabilir bölgeler (hotspot).
 *
 * Sunucu görselli reklamda `linkUrl`'i `null` gönderiyor; tıklama yalnız
 * `hotspots`tan geliyor ve sayaç ancak `?hotspot=<id>` ile sayılıyor. Kendi
 * sitemizin mutlak linkleri uygulama içinde açılmalı, tarayıcıya değil.
 */
import React from 'react';
import { Linking } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';

const mockUseAds = jest.fn();
jest.mock('@/hooks/useAds', () => ({
  useAds: (position: string) => mockUseAds(position),
}));

const mockRecordClick = jest.fn(() => Promise.resolve());
jest.mock('@/lib/api', () => ({
  adsApi: {
    recordImpression: jest.fn(() => Promise.resolve()),
    recordClick: (...args: unknown[]) => mockRecordClick(...(args as [])),
  },
}));

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  router: { push: (...a: unknown[]) => mockPush(...a) },
  useFocusEffect: () => {},
}));

import { AdBanner } from '../AdBanner';

const baseAd = {
  id: 'ad-1',
  title: 'Leaderboard',
  imageUrl: 'https://example.com/a.png',
  linkUrl: null,
  content: null,
  altText: null,
  width: 320,
  height: 50,
  position: 'header',
  deviceType: 'all',
};

function hotspot(over: Record<string, unknown> = {}) {
  return { id: 'h-1', x: 0, y: 0, width: 1, height: 1, label: 'Tümü', linkUrl: '/listings', sortOrder: 0, ...over };
}

function renderWith(ad: Record<string, unknown>) {
  mockUseAds.mockReturnValue({ ads: [{ ...baseAd, ...ad }], isAdFree: false, isLoading: false });
  return render(<AdBanner position="header" />);
}

describe('AdBanner — hotspots', () => {
  let openURL: jest.SpyInstance;

  beforeEach(() => {
    mockUseAds.mockReset();
    mockRecordClick.mockClear();
    mockPush.mockClear();
    openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
  });

  afterEach(() => openURL.mockRestore());

  it('kendi sitemizin mutlak linkini uygulama içinde açar ve tıklamayı bölgeyle sayar', () => {
    const { getByTestId } = renderWith({
      hotspots: [hotspot({ linkUrl: 'https://staging.tarodan.com.tr/listings?manufacturer=Hot+Wheels' })],
    });

    fireEvent.press(getByTestId('ad-hotspot-h-1'));

    expect(mockRecordClick).toHaveBeenCalledWith('ad-1', 'h-1');
    // Filtre korunur — liste sorgusuz arama sekmesine düşmez.
    expect(mockPush).toHaveBeenCalledWith('/search?manufacturer=Hot+Wheels');
    expect(openURL).not.toHaveBeenCalled();
  });

  it('kendi sitemizin ürün linkini mobil ürün ekranına çevirir', () => {
    const { getByTestId } = renderWith({
      hotspots: [hotspot({ linkUrl: 'https://tarodan.com.tr/listings/p-42' })],
    });

    fireEvent.press(getByTestId('ad-hotspot-h-1'));

    expect(mockPush).toHaveBeenCalledWith('/product/p-42');
  });

  it('dış adresi tarayıcıda açar', () => {
    const { getByTestId } = renderWith({
      hotspots: [hotspot({ linkUrl: 'https://example.org/kampanya' })],
    });

    fireEvent.press(getByTestId('ad-hotspot-h-1'));

    expect(openURL).toHaveBeenCalledWith('https://example.org/kampanya');
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('bölge varken görselin kendisi tıklanmaz', () => {
    const { getByTestId } = renderWith({
      linkUrl: '/should-not-open',
      hotspots: [hotspot({ x: 0.5, width: 0.5 })],
    });

    fireEvent.press(getByTestId('ad-banner-ad-1'));

    expect(mockPush).not.toHaveBeenCalled();
    expect(mockRecordClick).not.toHaveBeenCalled();
  });

  it('bölgesi olmayan eski reklamda linkUrl tüm görseli tıklanabilir yapar', () => {
    const { getByTestId } = renderWith({ linkUrl: '/listings?manufacturer=Hot+Wheels' });

    fireEvent.press(getByTestId('ad-banner-ad-1'));

    expect(mockRecordClick).toHaveBeenCalledWith('ad-1');
    expect(mockPush).toHaveBeenCalledWith('/search?manufacturer=Hot+Wheels');
  });

  it('görsel dışına taşan bölgeyi çizmez', () => {
    const { queryByTestId } = renderWith({
      hotspots: [hotspot({ id: 'bad', x: 0.8, width: 0.5 })],
    });

    expect(queryByTestId('ad-hotspot-bad')).toBeNull();
  });
});
