/**
 * Profil menüsü — yalnız profille ilgili grup (Hesap) + çıkış:
 *  - I2 regresyonu: "Kurumsal Başvuru" yalnızca kurumsal hesaplarda (companyName + taxId) görünür.
 *    Bireysel kullanıcıda tıklayınca useBusinessApplication 400/404 alıyor ve üç boş sekme gösteriyordu.
 *  - Diğer gruplar (Alışveriş, Finans, …) Ana Sayfa yan menüsünde: DrawerMenu.test.tsx.
 */
import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import i18n from '@/i18n/config';
import { avatarPlaceholderColors, theme } from '@/ui';
import { renderWithProviders } from '@/test-utils';
import { router } from 'expo-router';
import { ProfileCard, ProfileMenuSections } from '../ProfileSections';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

const f: any = {
  user: { id: 'u1', displayName: 'Ayşe Yılmaz', email: 'ayse@example.com' },
  isPaidTier: false,
  effectiveTier: 'free',
  handleLogout: jest.fn(),
};

it('bireysel hesapta "Kurumsal Başvuru" öğesini göstermez', () => {
  renderWithProviders(<ProfileMenuSections f={f} isBusiness={false} />);
  expect(screen.queryByTestId('settings-business-application')).toBeNull();
});

it('kurumsal hesapta "Kurumsal Başvuru" öğesini gösterir', () => {
  renderWithProviders(<ProfileMenuSections f={f} isBusiness />);
  expect(screen.getByTestId('settings-business-application')).toBeTruthy();
});

it('yalnız Hesap grubunu başlıksız gösterir; yan menü grupları profilde yok', () => {
  renderWithProviders(<ProfileMenuSections f={f} />);
  // Küçük "Hesap" grup başlığı kaldırıldı (kullanıcı geri bildirimi); satırlar yine görünür.
  expect(screen.queryByText('Hesap')).toBeNull();
  expect(screen.getByTestId('profile-language-link')).toBeTruthy();
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

it('çıkış diğer satırlarla aynı satır (ikon + chevron), yalnız metin ve ikon danger; hesabı sil profilde yok', () => {
  renderWithProviders(<ProfileMenuSections f={f} />);
  expect(screen.getByTestId('profile-logout-button-chevron')).toBeTruthy();
  const label = screen.getByText(i18n.t('common.logout'));
  expect(StyleSheet.flatten(label.props.style).color).toBe(theme.colors.danger[700]);
  expect(screen.queryByTestId('profile-delete-account-button')).toBeNull();
  expect(screen.queryByText(i18n.t('settings.deleteAccount'))).toBeNull();
  fireEvent.press(screen.getByTestId('profile-logout-button'));
  expect(f.handleLogout).toHaveBeenCalled();
});

it('her menü satırında sağ chevron var ve satır rotaya gider', () => {
  renderWithProviders(<ProfileMenuSections f={f} />);
  expect(screen.getByTestId('profile-language-link-chevron')).toBeTruthy();
  expect(screen.getByTestId('profile-blocked-users-link-chevron')).toBeTruthy();
  fireEvent.press(screen.getByTestId('profile-language-link'));
  expect(router.push).toHaveBeenCalledWith('/settings/language');
});

it('ücretli üyede tek üyelik satırı (plan + abonelik birleşik); satırda katman rozeti yok', () => {
  renderWithProviders(<ProfileMenuSections f={{ ...f, isPaidTier: true }} />);
  expect(screen.getByTestId('profile-membership-link')).toBeTruthy();
  expect(screen.queryByTestId('profile-subscription-link')).toBeNull();
  expect(screen.queryByText('Premium')).toBeNull();
});

it('işletme paneli yalnız business katmanında görünür', () => {
  renderWithProviders(<ProfileMenuSections f={f} />);
  expect(screen.queryByText(i18n.t('mobile.settingsBusinessPanel'))).toBeNull();
  screen.unmount();
  renderWithProviders(
    <ProfileMenuSections f={{ ...f, isPaidTier: true, effectiveTier: 'business' }} />,
  );
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
