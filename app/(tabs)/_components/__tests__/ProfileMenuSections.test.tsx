/**
 * Profil menüsü — kullanıcının işlemleri (Alışveriş · Finans · Koleksiyon · Analiz), gruplu, hep açık.
 * Hesap / ödeme ayarları / üyelik / tercihler / destek / yasal ve çıkış Ayarlar ekranında:
 * app/settings/__tests__/settings-screen.test.tsx.
 */
import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import i18n from '@/i18n/config';
import { avatarPlaceholderColors } from '@/ui';
import { renderWithProviders } from '@/test-utils';
import { router } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { ProfileCard, ProfileMenuSections } from '../ProfileSections';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

let mockTier = { effectiveTier: 'free', isPaidTier: false };
jest.mock('@/hooks/useMembershipTier', () => ({ useMembershipTier: () => mockTier }));

const f: any = {
  user: { id: 'u1', displayName: 'Ayşe Yılmaz', email: 'ayse@example.com' },
  isPaidTier: false,
  effectiveTier: 'free',
  handleLogout: jest.fn(),
};

beforeEach(() => {
  mockTier = { effectiveTier: 'free', isPaidTier: false };
  useAuthStore.setState({ isAuthenticated: false, user: { id: 'u1' } as any });
});

it('işlem grupları başlıklarıyla görünür (hep açık): Alışveriş, Finans, Koleksiyon, Analiz', () => {
  renderWithProviders(<ProfileMenuSections />);
  for (const title of ['Alışveriş', 'Finans', 'Koleksiyon', 'Analiz']) {
    expect(screen.getByText(title)).toBeTruthy();
  }
  for (const id of ['profile-orders-link', 'profile-offers-link', 'profile-trades-link', 'profile-payments-link', 'profile-refunds-link']) {
    expect(screen.getByTestId(id)).toBeTruthy();
  }
});

it('ayar satırları ve çıkış profilde YOK (Ayarlar ekranında)', () => {
  renderWithProviders(<ProfileMenuSections />);
  for (const id of [
    'profile-language-link',
    'profile-blocked-users-link',
    'profile-account-newsletter-link',
    'profile-payment-methods-link',
    'profile-legal-terms-link',
    'profile-logout-button',
  ]) {
    expect(screen.queryByTestId(id)).toBeNull();
  }
  expect(screen.queryByText(i18n.t('mobile.settingsBankAccount'))).toBeNull();
});

it('satıra basınca rotası açılır; her satırda chevron var', () => {
  renderWithProviders(<ProfileMenuSections />);
  expect(screen.getByTestId('profile-orders-link-chevron')).toBeTruthy();
  fireEvent.press(screen.getByTestId('profile-orders-link'));
  expect(router.push).toHaveBeenCalledWith('/orders');
});

it('işletme paneli yalnız business katmanında, Alışveriş grubunda', () => {
  renderWithProviders(<ProfileMenuSections />);
  expect(screen.queryByText(i18n.t('mobile.settingsBusinessPanel'))).toBeNull();
  screen.unmount();
  mockTier = { effectiveTier: 'business', isPaidTier: true };
  renderWithProviders(<ProfileMenuSections />);
  expect(screen.getByText(i18n.t('mobile.settingsBusinessPanel'))).toBeTruthy();
});

describe('ProfileCard — yatay kompakt kimlik başlığı', () => {
  // Eski alanlar verilse bile başlık rozet çizmez (ücretli + premium profil + skor).
  const trustF = { ...f, isPaidTier: true, isPremiumProfile: true, trustScore: 87, showTrustScore: true };

  it('ad ve e-posta tek satır; "Profili düzenle" kimlik satırının sağında kalem (metin düğme yok)', () => {
    renderWithProviders(<ProfileCard f={f} />);
    expect(screen.getByTestId('profile-name').props.numberOfLines).toBe(1);
    expect(screen.getByText('Ayşe Yılmaz')).toBeTruthy();
    expect(screen.getByText('ayse@example.com').props.numberOfLines).toBe(1);
    expect(screen.getByText('AY')).toBeTruthy(); // fotoğrafsız avatar baş harfleri
    expect(screen.getByTestId('profile-edit-button').props.accessibilityLabel).toBe(i18n.t('profile.editProfile'));
    expect(screen.queryByText(i18n.t('profile.editProfile'))).toBeNull();
  });

  it('avatar 64pt daire, metnin solunda (yatay satır)', () => {
    renderWithProviders(<ProfileCard f={f} />);
    const json = JSON.stringify(screen.toJSON());
    expect(json).toContain('"width":64');
    expect(json).toContain('"height":64');
    expect(json).toContain('"borderRadius":32');
    expect(json).toContain('"flexDirection":"row"');
  });

  it('fotoğrafsız avatar, profil düzenlemedekiyle aynı yer tutucu rengini kullanır', () => {
    renderWithProviders(<ProfileCard f={f} />);
    const json = JSON.stringify(screen.toJSON());
    expect(json).toContain(`"backgroundColor":"${avatarPlaceholderColors.background}"`);
    expect(StyleSheet.flatten(screen.getByText('AY').props.style).color).toBe(avatarPlaceholderColors.foreground);
  });

  it('rozet satırı yok: üyelik rozeti, güven skoru ve görünürlük çipi hiçbir durumda çizilmez', () => {
    renderWithProviders(<ProfileCard f={trustF} />);
    expect(screen.queryByTestId('profile-badges')).toBeNull();
    expect(screen.queryByTestId('profile-trust-visibility')).toBeNull();
    expect(screen.queryByText(i18n.t('profile.tierMemberBadge', { tier: 'Premium' }))).toBeNull();
    expect(screen.queryByText(i18n.t('seller.trustScoreLabel', { score: 87 }))).toBeNull();
    expect(screen.queryByText(i18n.t('mobile.profileTrustPublic'))).toBeNull();
  });
});
