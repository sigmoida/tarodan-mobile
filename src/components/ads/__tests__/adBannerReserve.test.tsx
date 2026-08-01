/**
 * AdBanner — reklam sırasında yer ayırma (B1).
 *
 * Banner ana sayfanın en tepesinde; query çözülene kadar hiç yer kaplamıyorsa
 * çözülünce tüm akışı ~110-130pt aşağı itiyor. Dört durumu kilitliyoruz:
 * reklamsız üye → null, yükleniyor → rezerve slot, yüklendi+boş → null,
 * yüklendi+reklam var → normal render.
 */
import React from 'react';
import { render } from '@testing-library/react-native';

const mockUseAds = jest.fn();
jest.mock('@/hooks/useAds', () => ({
  useAds: (position: string) => mockUseAds(position),
}));

import { AdBanner } from '../AdBanner';

describe('AdBanner — slot reservation', () => {
  beforeEach(() => {
    mockUseAds.mockReset();
  });

  it('reklamsız üyede hiç yer kaplamaz', () => {
    mockUseAds.mockReturnValue({ ads: [], isAdFree: true, isLoading: false });
    const { queryByTestId, toJSON } = render(<AdBanner position="header" />);
    expect(toJSON()).toBeNull();
    expect(queryByTestId('ad-banner-slot-reserved')).toBeNull();
  });

  it('reklam query yüklenirken yer kaplar', () => {
    mockUseAds.mockReturnValue({ ads: [], isAdFree: false, isLoading: true });
    const { getByTestId } = render(<AdBanner position="header" />);
    expect(getByTestId('ad-banner-slot-reserved')).toBeTruthy();
  });

  it('yükleme bitip reklam yoksa hiç render etmez', () => {
    mockUseAds.mockReturnValue({ ads: [], isAdFree: false, isLoading: false });
    const { toJSON } = render(<AdBanner position="header" />);
    expect(toJSON()).toBeNull();
  });

  it('yükleme bitip reklam varsa normal render eder', () => {
    mockUseAds.mockReturnValue({
      ads: [
        {
          id: 'ad-1',
          position: 'header',
          deviceType: 'all',
          imageUrl: 'https://example.com/a.png',
          width: 1200,
          height: 300,
        },
      ],
      isAdFree: false,
      isLoading: false,
    });
    const { getByTestId, queryByTestId } = render(<AdBanner position="header" />);
    expect(getByTestId('ad-banner')).toBeTruthy();
    expect(getByTestId('ad-banner-ad-1')).toBeTruthy();
    expect(queryByTestId('ad-banner-slot-reserved')).toBeNull();
  });
});
