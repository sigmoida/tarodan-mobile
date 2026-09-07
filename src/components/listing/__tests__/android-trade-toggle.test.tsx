/**
 * Android eşi (bkz. ios-trade-toggle.test.tsx): takas satırındaki yükseltme
 * çağrısı Android'de DEĞİŞMEDEN kalmalı.
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

import { ListingOptionsSection } from '../_components/ListingSections';

const baseF: any = {
  limits: { canTrade: false },
  isTradeEnabled: false,
  setIsTradeEnabled: jest.fn(),
  isSet: false,
  setIsSet: jest.fn(),
  bundleSize: '',
  setBundleSize: jest.fn(),
  isEdit: false,
  isPreorder: false,
  setIsPreorder: jest.fn(),
  status: 'active',
  setStatus: jest.fn(),
};

describe('Android: ilan formu takas satırı — ücretsiz katman', () => {
  it('yükseltme oku ve tier adı taşıyan açıklama yerinde', () => {
    render(<ListingOptionsSection f={baseF} />);
    expect(screen.getByText(/Premium'a Geç/i)).toBeTruthy();
    expect(screen.getByText('Takas özelliği Temel veya üstü üyelik gerektirir')).toBeTruthy();
  });
});
