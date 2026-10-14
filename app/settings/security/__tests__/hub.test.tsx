/**
 * Güvenlik hub'ı: formlar ayrı ekranlarda (diyalog yok); 2FA durumu sorgudan; tüm cihazlardan
 * çıkış onay diyaloğu (`confirm`) + mutation — hata toast.error, oturum kapanmaz.
 */
import React from 'react';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { appAlert, theme, toast } from '@/ui';
import { renderWithProviders } from '@/test-utils';
import { pushMock, replaceMock, resetRouterMocks } from '@/test-utils/router-mock';
import i18n from '@/i18n/config';

jest.mock('@/ui', () => {
  const actual = jest.requireActual('@/ui');
  const { confirmWith } = jest.requireActual('@/ui/components/AlertDialog');
  const appAlert = jest.fn();
  return {
    ...actual,
    appAlert,
    confirm: (options: unknown) => confirmWith(appAlert, options),
    toast: Object.assign(jest.fn(), { success: jest.fn(), error: jest.fn(), dismiss: jest.fn() }),
  };
});

let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  ...jest.requireActual('@/test-utils/router-mock').routerMock,
  useLocalSearchParams: () => mockParams,
}));

const mockLogout = jest.fn(() => Promise.resolve());
let mockUser: Record<string, unknown>;
jest.mock('@/stores/authStore', () => ({
  useAuthStore: (sel?: (state: Record<string, unknown>) => unknown) => {
    const state: Record<string, unknown> = { isAuthenticated: true, user: mockUser, logout: mockLogout };
    return sel ? sel(state) : state;
  },
}));

let mockEnabled = false;
const mockLogoutAll = jest.fn(() => Promise.resolve({ data: {} }));
const mockSendPhoneCode = jest.fn();
jest.mock('@/lib/api', () => ({
  authApi: {
    getTwoFactorStatus: () => Promise.resolve({ data: { isEnabled: mockEnabled } }),
    logoutAll: () => mockLogoutAll(),
    sendPhoneCode: () => mockSendPhoneCode(),
  },
}));

import SecuritySettingsScreen from '../index';

const alertMock = appAlert as jest.Mock;
const errorMock = toast.error as jest.Mock;

beforeEach(() => {
  mockParams = {};
  mockEnabled = false;
  mockUser = { phone: '+905551112233', isPhoneVerified: false };
  mockLogout.mockClear();
  mockLogoutAll.mockReset();
  mockLogoutAll.mockResolvedValue({ data: {} });
  mockSendPhoneCode.mockClear();
  errorMock.mockClear();
  resetRouterMocks();
});

async function confirmLogoutAll() {
  fireEvent.press(await screen.findByTestId('security-logout-all'));
  await waitFor(() => expect(alertMock).toHaveBeenCalled());
  const [title, , buttons] = alertMock.mock.calls[0]!;
  expect(title).toBe(i18n.t('security.logoutAllTitle'));
  await act(async () => {
    buttons.find((b: { style?: string }) => b.style === 'destructive').onPress();
  });
}

describe('settings/security hub', () => {
  it('formlar diyalog değil, ayrı ekranlar', async () => {
    renderWithProviders(<SecuritySettingsScreen />);
    fireEvent.press(await screen.findByTestId('security-password-button'));
    expect(pushMock).toHaveBeenLastCalledWith('/settings/security/password');
    fireEvent.press(screen.getByTestId('two-factor-manage-button'));
    expect(pushMock).toHaveBeenLastCalledWith('/settings/security/two-factor');
    fireEvent.press(screen.getByTestId('phone-verify-button'));
    expect(pushMock).toHaveBeenLastCalledWith('/settings/security/phone');
    expect(screen.queryByTestId('modal-root')).toBeNull();
  });

  it('tek kart kalıbı: her eylem aynı tip düğme (outline sm); tüm cihazlardan çıkış danger; ipuçları kartı yok', async () => {
    renderWithProviders(<SecuritySettingsScreen />);
    await screen.findByTestId('security-password-button');
    const style = (id: string) => {
      const s = screen.getByTestId(id).props.style;
      return StyleSheet.flatten(typeof s === 'function' ? s({ pressed: false }) : s);
    };
    for (const id of ['security-password-button', 'two-factor-manage-button', 'phone-verify-button']) {
      expect(style(id)).toMatchObject({
        backgroundColor: 'transparent',
        borderWidth: 1,
        minHeight: theme.controlHeight.sm,
      });
    }
    expect(style('security-logout-all')).toMatchObject({
      backgroundColor: theme.colors.danger[600],
      minHeight: theme.controlHeight.sm,
    });
    expect(screen.queryByText(i18n.t('security.tipsSection'))).toBeNull();
    expect(screen.queryByText(new RegExp(i18n.t('mobile.tipStrongPassword')))).toBeNull();
  });

  it('şifre kartında da açıklama satırı var', async () => {
    renderWithProviders(<SecuritySettingsScreen />);
    expect(await screen.findByText(i18n.t('profile.security.passwordDesc'))).toBeTruthy();
  });

  it('hesabı sil son kart: danger düğme, yazarak onay ekranına gider (silme burada çağrılmaz)', async () => {
    renderWithProviders(<SecuritySettingsScreen />);
    const button = await screen.findByTestId('security-delete-account');
    expect(screen.getByText(i18n.t('settings.dangerZone'))).toBeTruthy();
    expect(screen.getByText(i18n.t('settings.deleteAccountDetails'))).toBeTruthy();
    const s = button.props.style;
    expect(StyleSheet.flatten(typeof s === 'function' ? s({ pressed: false }) : s)).toMatchObject({
      backgroundColor: theme.colors.danger[600],
    });
    fireEvent.press(button);
    expect(pushMock).toHaveBeenLastCalledWith('/settings/delete-account');
    expect(alertMock).not.toHaveBeenCalled();
  });

  it('2FA açıkken "Yönet" + Aktif rozeti; kapalıyken "Ayarla"', async () => {
    mockEnabled = true;
    renderWithProviders(<SecuritySettingsScreen />);
    expect(await screen.findByText(i18n.t('profile.security.manage'))).toBeTruthy();
    expect(screen.getByText(i18n.t('common.active'))).toBeTruthy();
  });

  it('telefon doğrulanmışsa rozet, doğrula düğmesi yok', async () => {
    mockUser = { phone: '+905551112233', isPhoneVerified: true };
    renderWithProviders(<SecuritySettingsScreen />);
    expect(await screen.findByText(i18n.t('security.verified'))).toBeTruthy();
    expect(screen.queryByTestId('phone-verify-button')).toBeNull();
  });

  it('tüm cihazlardan çıkış: onay → istek → oturum kapanır, girişe dönülür', async () => {
    renderWithProviders(<SecuritySettingsScreen />);
    await confirmLogoutAll();
    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith('/(auth)/login'));
    expect(mockLogoutAll).toHaveBeenCalled();
    expect(mockLogout).toHaveBeenCalled();
  });

  it('tüm cihazlardan çıkış hatası: toast.error, oturum açık kalır', async () => {
    mockLogoutAll.mockRejectedValue({ isAxiosError: true });
    renderWithProviders(<SecuritySettingsScreen />);
    await confirmLogoutAll();
    await waitFor(() => expect(errorMock).toHaveBeenCalledWith(i18n.t('common.operationFailed')));
    expect(mockLogout).not.toHaveBeenCalled();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it('?verifyPhone= ile gelince doğrulama ekranına aynı parametreyle geçilir (kod orada gider)', async () => {
    mockParams = { verifyPhone: '+905321234567' };
    renderWithProviders(<SecuritySettingsScreen />);
    await waitFor(() =>
      expect(pushMock).toHaveBeenCalledWith({
        pathname: '/settings/security/phone',
        params: { verifyPhone: '+905321234567' },
      }),
    );
    expect(pushMock).toHaveBeenCalledTimes(1);
    expect(mockSendPhoneCode).not.toHaveBeenCalled();
  });
});
