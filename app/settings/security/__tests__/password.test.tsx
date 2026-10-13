/**
 * Şifre değiştir EKRANI (eski diyalog yerine): `useZodForm` alan hataları satır içi; API kuralı
 * (özel karakter) istemcide; başarı → geri + toast; sunucu hatası → toast.error, ekran kalır.
 */
import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { toast } from '@/ui';
import { renderWithProviders } from '@/test-utils';
import { backMock, canGoBackMock, resetRouterMocks } from '@/test-utils/router-mock';
import i18n from '@/i18n/config';

jest.mock('@/ui', () => ({
  ...jest.requireActual('@/ui'),
  appAlert: jest.fn(),
  toast: Object.assign(jest.fn(), { success: jest.fn(), error: jest.fn(), dismiss: jest.fn() }),
}));
jest.mock('expo-router', () => jest.requireActual('@/test-utils/router-mock').routerMock);
jest.mock('@/stores/authStore', () => ({
  useAuthStore: (sel?: (state: Record<string, unknown>) => unknown) => {
    const state: Record<string, unknown> = { isAuthenticated: true, user: { id: 'u1' } };
    return sel ? sel(state) : state;
  },
}));

const mockChangePassword = jest.fn((_c: string, _n: string) => Promise.resolve({ data: {} }));
jest.mock('@/lib/api', () => ({
  authApi: { changePassword: (c: string, n: string) => mockChangePassword(c, n) },
}));

import ChangePasswordScreen from '../password';

const successMock = toast.success as jest.Mock;
const errorMock = toast.error as jest.Mock;

beforeEach(() => {
  mockChangePassword.mockReset();
  mockChangePassword.mockResolvedValue({ data: {} });
  successMock.mockClear();
  errorMock.mockClear();
  resetRouterMocks();
  canGoBackMock.mockReturnValue(true);
});

function fill(current: string, next: string, confirm: string) {
  renderWithProviders(<ChangePasswordScreen />);
  fireEvent.changeText(screen.getByTestId('current-password-input'), current);
  fireEvent.changeText(screen.getByTestId('new-password-input'), next);
  fireEvent.changeText(screen.getByTestId('confirm-password-input'), confirm);
  fireEvent.press(screen.getByTestId('change-password-submit'));
}

describe('settings/security/password', () => {
  it('canlı gereksinim paneli görünür', () => {
    renderWithProviders(<ChangePasswordScreen />);
    expect(screen.getByTestId('password-checklist')).toBeTruthy();
  });

  it('tekrar eşleşmezse satır içi hata, istek yok', async () => {
    fill('Eski1234!', 'Yeni1234!', 'Yeni1234?');
    expect(await screen.findByText(i18n.t('validation.passwordMatch'))).toBeTruthy();
    expect(mockChangePassword).not.toHaveBeenCalled();
  });

  it('özel karakter yoksa API kuralı metni satır içi, istek yok', async () => {
    fill('Eski1234!', 'Yeni12345', 'Yeni12345');
    expect(await screen.findByText(i18n.t('security.passwordRules'))).toBeTruthy();
    expect(mockChangePassword).not.toHaveBeenCalled();
  });

  it('mevcut şifre boşsa satır içi hata', async () => {
    fill('', 'Yeni1234!', 'Yeni1234!');
    expect(await screen.findByText(i18n.t('validation.currentPasswordRequired'))).toBeTruthy();
    expect(mockChangePassword).not.toHaveBeenCalled();
  });

  it('başarı: istek gider, geri dönülür, toast', async () => {
    // Mevcut şifre olduğu gibi gider (kırpma yok — boşluk şifrenin parçası olabilir).
    fill(' Eski1234! ', 'Yeni1234!', 'Yeni1234!');
    await waitFor(() => expect(backMock).toHaveBeenCalled());
    expect(mockChangePassword).toHaveBeenCalledWith(' Eski1234! ', 'Yeni1234!');
    expect(successMock).toHaveBeenCalledWith(i18n.t('settings.passwordChanged'));
  });

  it('sunucu hatası: toast.error, ekran kalır', async () => {
    mockChangePassword.mockRejectedValue({ response: { data: { message: 'Mevcut şifre hatalı' } } });
    fill('Yanlis123!', 'Yeni1234!', 'Yeni1234!');
    await waitFor(() => expect(errorMock).toHaveBeenCalledWith('Mevcut şifre hatalı'));
    expect(backMock).not.toHaveBeenCalled();
  });
});
