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
const mockGetSignInMethods = jest.fn();
const mockForgotPassword = jest.fn((_email: string) => Promise.resolve({ data: {} }));
let mockGoogleConfigured = false;
let mockAppleAvailable = false;
jest.mock('@/services/googleSignin', () => ({ isGoogleConfigured: () => mockGoogleConfigured }));
jest.mock('@/services/appleSignin', () => ({ isAppleAvailable: () => Promise.resolve(mockAppleAvailable) }));
const mockLogoutAll = jest.fn(() => Promise.resolve({ data: {} }));
const mockSendPhoneCode = jest.fn();
jest.mock('@/lib/api', () => ({
  authApi: {
    getTwoFactorStatus: () => Promise.resolve({ data: { isEnabled: mockEnabled } }),
    getSignInMethods: () => mockGetSignInMethods(),
    forgotPassword: (email: string) => mockForgotPassword(email),
    logoutAll: () => mockLogoutAll(),
    sendPhoneCode: () => mockSendPhoneCode(),
  },
}));

/** The password card waits for the sign-in methods (disabled while they load). */
async function passwordButton() {
  const button = await screen.findByTestId('security-password-button');
  await waitFor(() => expect(button).toBeEnabled());
  return button;
}

import SecuritySettingsScreen from '../index';

const alertMock = appAlert as jest.Mock;
const errorMock = toast.error as jest.Mock;

const linked = (provider: 'google' | 'apple') => ({
  data: { hasPassword: false, providers: [{ provider, email: null, linkedAt: '2026-10-01T00:00:00.000Z' }] },
});

beforeEach(() => {
  mockParams = {};
  mockEnabled = false;
  mockGoogleConfigured = false;
  mockAppleAvailable = false;
  mockGetSignInMethods.mockReset();
  mockGetSignInMethods.mockResolvedValue({ data: { hasPassword: true, providers: [] } });
  mockForgotPassword.mockClear();
  (toast.success as jest.Mock).mockClear();
  mockUser = { email: 'user@ornek.com', phone: '+905551112233', isPhoneVerified: false };
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
    fireEvent.press(await passwordButton());
    expect(pushMock).toHaveBeenLastCalledWith('/settings/security/password');
    fireEvent.press(screen.getByTestId('two-factor-manage-button'));
    expect(pushMock).toHaveBeenLastCalledWith('/settings/security/two-factor');
    fireEvent.press(screen.getByTestId('phone-verify-button'));
    expect(pushMock).toHaveBeenLastCalledWith('/settings/security/phone');
    expect(screen.queryByTestId('modal-root')).toBeNull();
  });

  it('connected accounts: an entry card right after the password card opens its own screen', async () => {
    renderWithProviders(<SecuritySettingsScreen />);
    await passwordButton();
    expect(screen.getByText(i18n.t('profile.connectedAccounts.title'))).toBeTruthy();
    expect(screen.getByText(i18n.t('profile.connectedAccounts.description'))).toBeTruthy();
    const ids = screen
      .getAllByTestId(/^(security-password-button|security-connected-accounts-button|two-factor-manage-button)$/)
      .map((node) => node.props.testID);
    expect(ids).toEqual(['security-password-button', 'security-connected-accounts-button', 'two-factor-manage-button']);
    fireEvent.press(screen.getByTestId('security-connected-accounts-button'));
    expect(pushMock).toHaveBeenLastCalledWith('/settings/security/connected-accounts');
  });

  it('tek kart kalıbı: her eylem aynı tip düğme (outline sm); tüm cihazlardan çıkış danger; ipuçları kartı yok', async () => {
    renderWithProviders(<SecuritySettingsScreen />);
    await passwordButton();
    const style = (id: string) => {
      const s = screen.getByTestId(id).props.style;
      return StyleSheet.flatten(typeof s === 'function' ? s({ pressed: false }) : s);
    };
    for (const id of ['security-password-button', 'two-factor-manage-button', 'phone-verify-button']) {
      expect(style(id)).toMatchObject({
        backgroundColor: theme.colors.surface.elevated,
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

  it('2FA on: the 2FA card says "Manage" with the Active badge', async () => {
    mockEnabled = true;
    renderWithProviders(<SecuritySettingsScreen />);
    // "Manage" alone also labels the connected accounts card: wait on the 2FA badge.
    expect(await screen.findByText(i18n.t('common.active'))).toBeTruthy();
    expect(screen.getByTestId('two-factor-manage-button')).toHaveTextContent(i18n.t('profile.security.manage'));
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

describe('settings/security hub: password card mode (sign-in methods)', () => {
  it('with a password: "Change password", nothing else', async () => {
    renderWithProviders(<SecuritySettingsScreen />);
    await passwordButton();
    expect(screen.getByText(i18n.t('profile.security.passwordDesc'))).toBeTruthy();
    expect(screen.queryByTestId('security-set-password-button')).toBeNull();
  });

  it('without a password (Google linked, Google shown here): "Set a Password" opens the set-password screen', async () => {
    mockGoogleConfigured = true;
    mockGetSignInMethods.mockResolvedValue(linked('google'));
    renderWithProviders(<SecuritySettingsScreen />);
    const button = await screen.findByTestId('security-set-password-button');
    expect(screen.getByText(i18n.t('profile.security.setPasswordTitle'))).toBeTruthy();
    expect(screen.getByText(i18n.t('profile.security.setPasswordIntro'))).toBeTruthy();
    expect(screen.queryByTestId('security-password-button')).toBeNull();
    fireEvent.press(button);
    await waitFor(() => expect(pushMock).toHaveBeenLastCalledWith('/settings/security/set-password'));
    expect(mockForgotPassword).not.toHaveBeenCalled();
  });

  it('Apple linked on iOS: the set-password screen (Apple can confirm here)', async () => {
    mockAppleAvailable = true;
    mockGetSignInMethods.mockResolvedValue(linked('apple'));
    renderWithProviders(<SecuritySettingsScreen />);
    const button = await screen.findByTestId('security-set-password-button');
    // Tapped at once: the Apple check runs at tap time, not from a first render's "no Apple".
    fireEvent.press(button);
    await waitFor(() => expect(pushMock).toHaveBeenLastCalledWith('/settings/security/set-password'));
    expect(mockForgotPassword).not.toHaveBeenCalled();
  });

  it.each([
    ['an Apple-only account on Android', linked('apple')],
    ['a Google-only account while Google is off on Android', linked('google')],
  ])('%s: "Set a password" sends the mail (ADR 0012), no screen', async (_l, methods) => {
    mockGetSignInMethods.mockResolvedValue(methods);
    renderWithProviders(<SecuritySettingsScreen />);
    fireEvent.press(await screen.findByTestId('security-set-password-button'));
    await waitFor(() => expect(mockForgotPassword).toHaveBeenCalledWith('user@ornek.com'));
    expect(toast.success).toHaveBeenCalledWith(i18n.t('auth.setPasswordEmailSent'));
    expect(pushMock).not.toHaveBeenCalledWith('/settings/security/set-password');
  });

  it('the sign-in methods cannot be read: falls back to "Change password"', async () => {
    mockGetSignInMethods.mockRejectedValue({ isAxiosError: true, response: { status: 404, data: {} } });
    renderWithProviders(<SecuritySettingsScreen />);
    fireEvent.press(await passwordButton());
    expect(pushMock).toHaveBeenLastCalledWith('/settings/security/password');
  });
});
