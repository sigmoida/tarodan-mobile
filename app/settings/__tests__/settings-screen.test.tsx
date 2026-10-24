/**
 * Ayarlar (`/settings`, Profil üst barındaki ⚙️): Hesap · Ödeme ve Banka · Üyelik · Tercihler ·
 * Yardım & Destek · Bilgi & Yasal + çıkış. Misafirde yalnız dil, yardım ve bilgi/yasal.
 *  - I2 regresyonu: "Kurumsal Başvuru" yalnızca kurumsal hesaplarda (companyName + taxId).
 *  - Apple 2.1(b): iOS'ta ücretsiz kullanıcı "Üyelik Planı"nı görmez; ücretli üye tek satır görür.
 */
import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import i18n from '@/i18n/config';
import { theme } from '@/ui';
import { renderWithProviders } from '@/test-utils';
import { pushMock, replaceMock, resetRouterMocks } from '@/test-utils/router-mock';
import { useAuthStore } from '@/stores/authStore';

jest.mock('expo-router', () => require('@/test-utils/router-mock').routerMock);
jest.mock('@/lib/purchases', () => ({ CAN_BUY_DIGITAL: false }));

let mockTier = { effectiveTier: 'free', isPaidTier: false };
jest.mock('@/hooks/useMembershipTier', () => ({ useMembershipTier: () => mockTier }));

import SettingsScreen from '..';

const logout = jest.fn(() => Promise.resolve());
const member = (user: Record<string, unknown> = {}) =>
  useAuthStore.setState({ isAuthenticated: true, isLoading: false, user: { id: 'u1', ...user } as any, logout } as any);

beforeEach(() => {
  resetRouterMocks();
  logout.mockClear();
  mockTier = { effectiveTier: 'free', isPaidTier: false };
});

describe('Ayarlar — üye', () => {
  it('ayar grupları ve satırları; işlem satırları (sipariş, teklif…) yok', () => {
    member();
    renderWithProviders(<SettingsScreen />);
    for (const title of ['Hesap', 'Ödeme ve Banka', 'Tercihler', 'Yardım & Destek', 'Bilgi ve Yasal']) {
      expect(screen.getByText(title)).toBeTruthy();
    }
    for (const id of [
      'settings-edit-profile-link',
      'profile-blocked-users-link',
      'profile-payment-methods-link',
      'profile-account-newsletter-link',
      'profile-language-link',
      'profile-legal-terms-link',
    ]) {
      expect(screen.getByTestId(id)).toBeTruthy();
    }
    expect(screen.getByText(i18n.t('mobile.settingsBankAccount'))).toBeTruthy();
    expect(screen.queryByTestId('profile-orders-link')).toBeNull();
    expect(screen.queryByTestId('profile-offers-link')).toBeNull();
  });

  it('satır rotasını açar', () => {
    member();
    renderWithProviders(<SettingsScreen />);
    fireEvent.press(screen.getByTestId('profile-language-link'));
    expect(pushMock).toHaveBeenCalledWith('/settings/language');
  });

  it('"Kurumsal Başvuru" yalnız kurumsal hesapta', () => {
    member();
    renderWithProviders(<SettingsScreen />);
    expect(screen.queryByTestId('settings-business-application')).toBeNull();
    screen.unmount();
    member({ companyName: 'ACME', taxId: '123' });
    renderWithProviders(<SettingsScreen />);
    expect(screen.getByTestId('settings-business-application')).toBeTruthy();
  });

  it('iOS: ücretsiz kullanıcı "Üyelik Planı"nı görmez; ücretli üye tek satır görür (ayrı "Aboneliğim" yok)', () => {
    member();
    renderWithProviders(<SettingsScreen />);
    expect(screen.queryByTestId('profile-membership-link')).toBeNull();
    screen.unmount();
    mockTier = { effectiveTier: 'premium', isPaidTier: true };
    renderWithProviders(<SettingsScreen />);
    expect(screen.getByTestId('profile-membership-link')).toBeTruthy();
    expect(screen.queryByTestId('profile-subscription-link')).toBeNull();
  });

  it('çıkış en altta, danger tonda; basınca oturum kapanır ve girişe gider', async () => {
    member();
    renderWithProviders(<SettingsScreen />);
    const label = screen.getByText(i18n.t('common.logout'));
    expect(StyleSheet.flatten(label.props.style).color).toBe(theme.colors.danger[700]);
    fireEvent.press(screen.getByTestId('profile-logout-button'));
    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith('/(auth)/login'));
    expect(logout).toHaveBeenCalled();
  });
});

describe('Ayarlar — misafir', () => {
  it('yalnız dil, yardım ve bilgi/yasal; hesap satırları ve çıkış yok', () => {
    useAuthStore.setState({ isAuthenticated: false, isLoading: false, user: null } as any);
    renderWithProviders(<SettingsScreen />);
    expect(screen.getByTestId('profile-language-link')).toBeTruthy();
    expect(screen.getByText(i18n.t('mobile.settingsHelpFaq'))).toBeTruthy();
    expect(screen.getByTestId('profile-legal-terms-link')).toBeTruthy();
    expect(screen.queryByTestId('settings-edit-profile-link')).toBeNull();
    expect(screen.queryByTestId('profile-account-newsletter-link')).toBeNull();
    expect(screen.queryByTestId('profile-logout-button')).toBeNull();
  });
});

describe('Settings on large screens', () => {
  const { Dimensions } = jest.requireActual('react-native');
  const setWindow = (width: number, height: number) =>
    Dimensions.set({
      window: { width, height, scale: 2, fontScale: 2 },
      screen: { width, height, scale: 2, fontScale: 2 },
    });
  afterEach(() => {
    screen.unmount();
    setWindow(375, 667);
  });
  const groupIds = (column: string) =>
    screen
      .getByTestId(column)
      .findAll((n: { props: { testID?: string } }) => /^menu-group-[a-z]/.test(n.props.testID ?? '') && !/column/.test(n.props.testID ?? ''))
      .map((n: { props: { testID?: string } }) => n.props.testID)
      .filter((id: string | undefined, i: number, all: Array<string | undefined>) => all.indexOf(id) === i);

  it('1032 pt: the section cards stand in two balanced columns, every group once, at the tablet gutter', () => {
    member();
    setWindow(1032, 1376);
    renderWithProviders(<SettingsScreen />);
    const left = groupIds('menu-group-column-0');
    const right = groupIds('menu-group-column-1');
    expect(left.length).toBeGreaterThan(0);
    expect(right.length).toBeGreaterThan(0);
    for (const title of ['Hesap', 'Ödeme ve Banka', 'Tercihler', 'Yardım & Destek', 'Bilgi ve Yasal']) {
      expect(screen.getAllByText(title)).toHaveLength(1);
    }
    expect(new Set([...left, ...right]).size).toBe(left.length + right.length);
    const columns = StyleSheet.flatten(screen.getByTestId('menu-group-columns').props.style);
    expect(columns.flexDirection).toBe('row');
  });

  it('1032 pt: Info & Legal spans both columns, below them', () => {
    member();
    setWindow(1032, 1376);
    renderWithProviders(<SettingsScreen />);
    expect([...groupIds('menu-group-column-0'), ...groupIds('menu-group-column-1')]).not.toContain('menu-group-info');
    expect(screen.getByTestId('menu-group-info')).toBeOnTheScreen();
  });

  it.each([
    [390, 844],
    [820, 1180],
  ])('%d pt: one column (no column split)', (w, h) => {
    member();
    setWindow(w, h);
    renderWithProviders(<SettingsScreen />);
    expect(screen.queryByTestId('menu-group-columns')).toBeNull();
    expect(screen.getByText('Hesap')).toBeTruthy();
  });
});
