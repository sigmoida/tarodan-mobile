/**
 * iOS: ilan formunda limit dolu kartı — ücretsiz katmanda `address.goPremium`
 * düğmesi UpgradeCta ile sarılı olmalı (CRITICAL 3, final code review).
 * Gerçek (mock'lanmamış) `react-i18next` kullanılıyor. Android eşi:
 * android-listing-limit-card.test.tsx.
 */
import React from 'react';
import { render, screen } from '@testing-library/react-native';

jest.mock('@/lib/purchases', () => ({
  ...jest.requireActual('@/lib/purchases'),
  CAN_BUY_DIGITAL: false,
}));

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => false) },
}));

import { ListingHeaderBanners } from '../_components/ListingSections';

const baseF: any = {
  isEdit: false,
  bankAccountQuery: { isLoading: false },
  hasBankAccount: true,
  limitsLoading: false,
  listingLimits: {
    isPremium: false,
    canCreateListing: false,
    maxListings: 5,
    currentCount: 5,
    remainingListings: 0,
  },
  status: 'active',
};

describe('iOS: ilan formu — limit dolu kartı (ücretsiz katman)', () => {
  it('"Premium\'a Geç" düğmesi yok; kendi kota durumu görünür', () => {
    render(<ListingHeaderBanners f={baseF} />);
    // Kendi kota durumu — kalmalı (olgu, tier adı değil).
    expect(screen.getByText('İlan Hakkı: 5 / 5')).toBeTruthy();
    // Yükseltme düğmesi (UpgradeCta ile sarılı) kapalı.
    expect(screen.queryByText("Premium'a Geç")).toBeNull();
  });
});
