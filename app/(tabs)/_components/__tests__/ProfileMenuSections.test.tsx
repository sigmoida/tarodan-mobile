/**
 * Profil menüsü — yalnız profille ilgili grup (Hesap) + çıkış:
 *  - I2 regresyonu: "Kurumsal Başvuru" yalnızca kurumsal hesaplarda (companyName + taxId) görünür.
 *    Bireysel kullanıcıda tıklayınca useBusinessApplication 400/404 alıyor ve üç boş sekme gösteriyordu.
 *  - Diğer gruplar (Alışveriş, Finans, …) Ana Sayfa yan menüsünde: DrawerMenu.test.tsx.
 */
import React from 'react';
import { screen } from '@testing-library/react-native';
import i18n from '@/i18n/config';
import { renderWithProviders } from '@/test-utils';
import { ProfileMenuSections } from '../ProfileSections';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

const f: any = {
  isPaidTier: false,
  tierLabel: 'Free',
  effectiveTier: 'free',
  handleLogout: jest.fn(),
  handleDeleteAccount: jest.fn(),
};

it('bireysel hesapta "Kurumsal Başvuru" öğesini göstermez', () => {
  renderWithProviders(<ProfileMenuSections f={f} isBusiness={false} />);
  expect(screen.queryByTestId('settings-business-application')).toBeNull();
});

it('kurumsal hesapta "Kurumsal Başvuru" öğesini gösterir', () => {
  renderWithProviders(<ProfileMenuSections f={f} isBusiness />);
  expect(screen.getByTestId('settings-business-application')).toBeTruthy();
});

it('yalnız Hesap grubunu gösterir; yan menü grupları profilde yok', () => {
  renderWithProviders(<ProfileMenuSections f={f} />);
  expect(screen.getByText('Hesap')).toBeTruthy();
  for (const title of ['Alışveriş', 'Finans', 'Koleksiyon', 'Analiz', 'İletişim', 'Bilgi ve Yasal']) {
    expect(screen.queryByText(title)).toBeNull();
  }
  for (const id of ['profile-orders-link', 'profile-offers-link', 'profile-payments-link', 'profile-info-about-link']) {
    expect(screen.queryByTestId(id)).toBeNull();
  }
});

it('hesap ayarları satırları profilde kalır (adresler, banka hesabı, güvenlik, bildirim, dil, engellenenler)', () => {
  renderWithProviders(<ProfileMenuSections f={f} />);
  for (const key of [
    'mobile.settingsAddresses',
    'mobile.settingsBankAccount',
    'profile.sidebar.guvenlik',
    'mobile.settingsNotifications',
    'mobile.settingsLanguage',
    'profile.sidebar.engellenenler',
  ] as const) {
    expect(screen.getByText(i18n.t(key))).toBeTruthy();
  }
  expect(screen.getByTestId('profile-language-link')).toBeTruthy();
  expect(screen.getByTestId('profile-blocked-users-link')).toBeTruthy();
  expect(screen.getByTestId('profile-account-newsletter-link')).toBeTruthy();
});

it('çıkış satırı kalır', () => {
  renderWithProviders(<ProfileMenuSections f={f} />);
  expect(screen.getByTestId('profile-logout-button')).toBeTruthy();
});
