/**
 * AdBanner — yalnız boşluk içeren imageUrl görsel reklam sayılmaz: metin reklam
 * olarak çizilir (boş görsel kutusu ve sonsuz "yükleniyor" olmaz).
 */
import React from 'react';
import { render } from '@testing-library/react-native';

const mockUseAds = jest.fn();
jest.mock('@/hooks/useAds', () => ({
  useAds: (position: string) => mockUseAds(position),
}));

jest.mock('@/lib/api', () => ({
  adsApi: { recordImpression: jest.fn(() => Promise.resolve()), recordClick: jest.fn(() => Promise.resolve()) },
}));

jest.mock('expo-router', () => ({ router: { push: jest.fn() }, useFocusEffect: () => undefined }));

import { AdBanner } from '../AdBanner';

it('imageUrl yalnız boşluksa metin reklam olarak çizilir', () => {
  mockUseAds.mockReturnValue({
    ads: [
      {
        id: 'ad-1', title: 'Duyuru', imageUrl: '   ', linkUrl: null, content: null, altText: null,
        width: null, height: null, position: 'header', deviceType: 'all',
      },
    ],
    isAdFree: false,
    isLoading: false,
  });
  const { getByTestId, getByText } = render(<AdBanner />);
  expect(getByTestId('ad-text-ad-1')).toBeTruthy();
  expect(getByText('Duyuru')).toBeTruthy();
});
