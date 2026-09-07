/**
 * Android eşi (bkz. ios-guest-profile.test.tsx): Premium kartı Android'de
 * DEĞİŞMEDEN görünmeye devam etmeli.
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

import { ProfileGuestView } from '../_components/ProfileGuestView';

const f: any = {
  snackbarVisible: false,
  setSnackbarVisible: jest.fn(),
  snackbarMessage: '',
  showPrompt: false,
  setShowPrompt: jest.fn(),
  promptType: 'favorites',
};

describe('Android: misafir Profil sekmesi — Premium kartı yerinde', () => {
  it('fiyat ve düğme görünür', () => {
    render(<ProfileGuestView f={f} />);
    expect(screen.getByText('Premium Üyelik')).toBeTruthy();
    expect(screen.getByText('₺99')).toBeTruthy();
    expect(screen.getByText('Premium Ol')).toBeTruthy();
  });
});
