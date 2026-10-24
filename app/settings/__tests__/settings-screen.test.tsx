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
jest.mock('expo-updates', () => ({
  __esModule: true,
  updateId: 'a1b2c3d4-e5f6-4789-abcd-ef0123456789',
  isEmbeddedLaunch: false,
}));
jest.mock('expo-application', () => ({ __esModule: true, nativeBuildVersion: '343' }));
// jest-expo's Constants carries no `expoConfig.version`.
jest.mock('@/constants/appUpdate', () => ({
  ...jest.requireActual('@/constants/appUpdate'),
  getAppVersion: () => '1.2.3',
}));

let mockTier = { effectiveTier: 'free', isPaidTier: false };
jest.mock('@/hooks/useMembershipTier', () => ({ useMembershipTier: () => mockTier }));

import SettingsScreen from '..';

const logout = jest.fn(() => Promise.resolve());
const member = (user: Record<string, unknown> = {}) =>
  useAuthStore.setState({ isAuthenticated: true, isLoading: false, user: { id: 'u1', ...user } as any, logout } as any);
const guest = () => useAuthStore.setState({ isAuthenticated: false, isLoading: false, user: null });

type Node = { parent: Node | null; children: (Node | string)[]; props: Record<string, unknown> };

/** Climbs from the build label to the node that is one child of the screen body. */
const bodyChild = (node: Node): Node => {
  let n = node;
  while (n.parent && n.parent.children.length === 1) n = n.parent;
  return n;
};
const hasTestId = (node: Node | string, id: string): boolean =>
  typeof node !== 'string' && (node.props.testID === id || node.children.some((c) => hasTestId(c, id)));

/** The build label is the screen body's last element and follows the element holding `previousId`. */
const expectBuildLabelLastAfter = (previousId: string) => {
  const label = screen.getByTestId('settings-build-label');
  // __DEV__ test bundle -> Development; the OTA id is cut to 6 characters.
  expect(label).toHaveTextContent('1.2.3 (343) · a1b2c3 (Development)');
  expect(label.props.accessibilityLabel).toBe('Uygulama sürümü 1.2.3 (343) · a1b2c3 (Development)');
  const row = bodyChild(label as unknown as Node);
  const siblings = row.parent!.children;
  expect(siblings[siblings.length - 1]).toBe(row);
  expect(hasTestId(siblings[siblings.length - 2]!, previousId)).toBe(true);
};

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
  it('sürüm etiketi en altta, çıkış kartının altında', () => {
    member();
    renderWithProviders(<SettingsScreen />);
    expectBuildLabelLastAfter('settings-logout-card');
  });
});

describe('Ayarlar — misafir', () => {
  it('yalnız dil, yardım ve bilgi/yasal; hesap satırları ve çıkış yok', () => {
    guest();
    renderWithProviders(<SettingsScreen />);
    expect(screen.getByTestId('profile-language-link')).toBeTruthy();
    expect(screen.getByText(i18n.t('mobile.settingsHelpFaq'))).toBeTruthy();
    expect(screen.getByTestId('profile-legal-terms-link')).toBeTruthy();
    expect(screen.queryByTestId('settings-edit-profile-link')).toBeNull();
    expect(screen.queryByTestId('profile-account-newsletter-link')).toBeNull();
    expect(screen.queryByTestId('profile-logout-button')).toBeNull();
  });

  it('sürüm etiketi en altta, menü gruplarının altında', () => {
    guest();
    renderWithProviders(<SettingsScreen />);
    expectBuildLabelLastAfter('profile-legal-terms-link');
  });
});
