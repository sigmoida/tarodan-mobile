/**
 * AdBanner — flaş geri sayım: gün birimi i18n'den gelir (tr "g", en "d").
 */
import React from 'react';
import { act, render } from '@testing-library/react-native';
import i18n from '@/i18n/config';

const mockUseAds = jest.fn();
jest.mock('@/hooks/useAds', () => ({
  useAds: (position: string) => mockUseAds(position),
}));

jest.mock('@/lib/api', () => ({
  adsApi: { recordImpression: jest.fn(() => Promise.resolve()), recordClick: jest.fn(() => Promise.resolve()) },
}));

jest.mock('expo-router', () => ({ router: { push: jest.fn() }, useFocusEffect: () => undefined }));

import { AdBanner } from '../AdBanner';

const textAd = (campaign: Record<string, unknown> | null) => ({
  id: 'ad-1',
  title: 'Flaş',
  imageUrl: null,
  linkUrl: null,
  content: null,
  altText: null,
  width: null,
  height: null,
  position: 'header',
  deviceType: 'all',
  campaign,
});

const setAd = (campaign: Record<string, unknown> | null) =>
  mockUseAds.mockReturnValue({ ads: [textAd(campaign)], isAdFree: false, isLoading: false });

const inDays = (d: number) => new Date(Date.now() + (d * 86400 + 3600) * 1000).toISOString();

describe('AdBanner — geri sayım gün birimi', () => {
  afterEach(async () => {
    await act(async () => {
      await i18n.changeLanguage('tr');
    });
  });

  it('tr: "2g 01:00"', () => {
    setAd({ id: 'c', name: 'K', code: null, target: 'all', isFlashSale: true, endsAt: inDays(2) });
    const { getByText } = render(<AdBanner />);
    expect(getByText(/⚡ 2g 0[01]:\d\d/)).toBeTruthy();
  });

  it('en: "2d 01:00"', async () => {
    await act(async () => {
      await i18n.changeLanguage('en');
    });
    setAd({ id: 'c', name: 'K', code: null, target: 'all', isFlashSale: true, endsAt: inDays(2) });
    const { getByText } = render(<AdBanner />);
    expect(getByText(/⚡ 2d 0[01]:\d\d/)).toBeTruthy();
  });
});
