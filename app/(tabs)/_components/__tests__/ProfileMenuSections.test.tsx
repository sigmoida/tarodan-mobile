/**
 * Profil menüsü (web ProfileSidebar'ın gruplu yapısı):
 *  - I2 regresyonu: "Kurumsal Başvuru" yalnızca kurumsal hesaplarda (companyName + taxId) görünür.
 *    Bireysel kullanıcıda tıklayınca useBusinessApplication 400/404 alıyor ve üç boş sekme gösteriyordu.
 *  - Grup başlıkları web `profile.sidebar.*` etiketleri; sayaç rozeti danger-500 (bekleyen teklif/takas).
 */
import React from 'react';
import { screen } from '@testing-library/react-native';
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

it('web ProfileSidebar grup başlıklarını gösterir', () => {
  renderWithProviders(<ProfileMenuSections f={f} />);
  // overline varyantı büyük harfe çevirir ama metin düğümü özgün kalır.
  for (const title of ['Alışveriş', 'Finans', 'Koleksiyon', 'Analiz', 'İletişim', 'Hesap']) {
    expect(screen.getByText(title)).toBeTruthy();
  }
});

it('bekleyen teklif/takas sayaçlarını satırda rozet olarak gösterir (99+ sınırı)', () => {
  renderWithProviders(
    <ProfileMenuSections f={f} badges={{ pendingOffers: 3, pendingTrades: 120 }} />,
  );
  expect(screen.getByTestId('profile-offers-link-badge')).toBeTruthy();
  expect(screen.getByText('3')).toBeTruthy();
  expect(screen.getByText('99+')).toBeTruthy();
});

it('sayaç 0 ise rozet çizilmez', () => {
  renderWithProviders(
    <ProfileMenuSections f={f} badges={{ pendingOffers: 0, pendingTrades: 0 }} />,
  );
  expect(screen.queryByTestId('profile-offers-link-badge')).toBeNull();
  expect(screen.queryByTestId('profile-trades-link-badge')).toBeNull();
});

it('çıkış satırı kalır', () => {
  renderWithProviders(<ProfileMenuSections f={f} />);
  expect(screen.getByTestId('profile-logout-button')).toBeTruthy();
});
