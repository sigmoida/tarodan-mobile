/**
 * Profil sekmesi: "Profili düzenle" kimlik satırının sağında kalem (üst barın sağı sekme köklerinde sabit: Mesajlar + Bildirimler). testID
 * `profile-edit-button` AYNEN korunur — Maestro akışları (34 adet) giriş yapılmış mı kontrolünü
 * buna bağlar; misafir görünümünde bu düğme OLMAMALI.
 */
import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => false) },
}));
jest.mock('@/components/shell/useShellCounts', () => ({
  useShellCounts: () => ({ cartCount: 0, notificationCount: 0 }),
}));
jest.mock('expo-status-bar', () => ({ setStatusBarStyle: jest.fn() }));

let mockF: Record<string, unknown>;
jest.mock('../_hooks/useProfile', () => ({ useProfile: () => mockF }));

import { router } from 'expo-router';
import ProfileScreen from '../profile';

const member = {
  isAuthenticated: true,
  user: { id: 'u1', displayName: 'Ayşe Yılmaz', email: 'ayse@example.com' },
  isPaidTier: false,
  tierLabel: 'Premium',
  effectiveTier: 'free',
  isPremiumProfile: false,
  trustScore: null,
  refreshing: false,
  onRefresh: jest.fn(),
  handleLogout: jest.fn(),
};

describe('profil sekmesi · düzenle kalemi', () => {
  it('üyede kimlik satırında kalem var ve Profili Düzenle ekranına gider', () => {
    mockF = member;
    renderWithProviders(<ProfileScreen />);
    const pencil = screen.getByTestId('profile-edit-button');
    expect(pencil.props.accessibilityLabel).toBe('Profili Düzenle');
    fireEvent.press(pencil);
    expect(router.push).toHaveBeenCalledWith('/settings/edit-profile');
    // Kimlik başlığı da çizilir (yatay kompakt).
    expect(screen.getByTestId('profile-header')).toBeTruthy();
  });

  it('misafirde kalem yok', () => {
    mockF = { isAuthenticated: false, showPrompt: false, setShowPrompt: jest.fn(), promptType: 'favorites' };
    renderWithProviders(<ProfileScreen />);
    expect(screen.queryByTestId('profile-edit-button')).toBeNull();
    expect(screen.getByTestId('profile-go-login-button')).toBeTruthy();
  });
});
