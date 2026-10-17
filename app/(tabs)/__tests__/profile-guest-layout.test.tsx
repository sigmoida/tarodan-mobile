/**
 * Misafir Profil sekmesi düzeni (Storytel "Profilim" gibi): ortalı boş avatar, birincil "Giriş Yap" +
 * outline "Ücretsiz Üye Ol" (beyaz kartta), altında ikonlu + chevron'lu satırlar (beyaz kartta). Dil, yardım
 * ve bilgi/yasal Ayarlar'da (üst barın sağındaki ⚙️).
 */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => false) },
}));
jest.mock('@/components/shell/useShellCounts', () => ({
  useShellCounts: () => ({ cartCount: 0, notificationCount: 0 }),
}));
jest.mock('expo-status-bar', () => ({ setStatusBarStyle: jest.fn() }));

import { router } from 'expo-router';
import { ProfileGuestView } from '../_components/ProfileGuestView';

const f: any = { showPrompt: false, setShowPrompt: jest.fn(), promptType: 'favorites' };

describe('misafir profil düzeni', () => {
  it('giriş ve kayıt düğmeleri ilgili rotalara gider', () => {
    render(<ProfileGuestView f={f} />);
    fireEvent.press(screen.getByTestId('profile-go-login-button'));
    expect(router.push).toHaveBeenCalledWith('/(auth)/login');
    fireEvent.press(screen.getByTestId('profile-go-register-button'));
    expect(router.push).toHaveBeenCalledWith('/(auth)/register');
  });

  it('Profil kökü: sol slot boş; sağda yalnız ⚙️ Ayarlar (mesaj/bildirim yok)', () => {
    render(<ProfileGuestView f={f} />);
    expect(screen.queryByTestId('app-shell-menu')).toBeNull();
    expect(screen.queryByTestId('app-shell-categories')).toBeNull();
    expect(screen.queryByTestId('app-shell-messages')).toBeNull();
    fireEvent.press(screen.getByTestId('app-shell-settings'));
    expect(router.push).toHaveBeenCalledWith('/settings');
  });

  it('boş avatar dairesi 120pt ve baş harf metni yok', () => {
    render(<ProfileGuestView f={f} />);
    expect(screen.queryByText('?')).toBeNull();
    const json = JSON.stringify(screen.toJSON());
    expect(json).toContain('"width":120');
    expect(json).toContain('"borderRadius":60');
  });

  it('karşılama ve bağlantılar beyaz kartlarda; dil satırı profilde değil (Ayarlar\'da)', () => {
    render(<ProfileGuestView f={f} />);
    expect(screen.getByTestId('profile-guest-card')).toBeTruthy();
    expect(screen.getByTestId('profile-guest-links')).toBeTruthy();
    expect(screen.queryByTestId('profile-language-link')).toBeNull();
  });
});
