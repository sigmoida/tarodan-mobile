/**
 * Android eşi (bkz. ios-listing-limit-card.test.tsx): "Premium'a Geç"
 * düğmesi Android'de DEĞİŞMEDEN görünmeye devam etmeli.
 */
import React from 'react';
import { render, screen } from '@testing-library/react-native';

jest.mock('@/lib/purchases', () => ({
  ...jest.requireActual('@/lib/purchases'),
  CAN_BUY_DIGITAL: true,
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

describe('Android: ilan formu — limit dolu kartı (ücretsiz katman)', () => {
  it('"Premium\'a Geç" düğmesi yerinde', () => {
    render(<ListingHeaderBanners f={baseF} />);
    expect(screen.getByText("Premium'a Geç")).toBeTruthy();
  });
});
