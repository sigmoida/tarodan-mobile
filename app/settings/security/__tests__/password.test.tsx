/**
 * Şifre değiştir EKRANI (eski diyalog yerine): `useZodForm` alan hataları satır içi; şifre kuralı
 * tek kaynak (`passwordSchema`: 8+, büyük, küçük, rakam — özel karakter ŞART DEĞİL); ayrı kural
 * kartı yok, yazarken alanın altında yalnız eksik kurallar; başarı → geri + toast; sunucu hatası →
 * toast.error, ekran kalır.
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
  it('ayrı kural kartı yok; yazarken alanın altında ANLIK yalnız eksik kural(lar)', () => {
    renderWithProviders(<ChangePasswordScreen />);
    expect(screen.queryByTestId('password-checklist')).toBeNull();
    // Boş alan: uyarı yok.
    expect(screen.queryByText(i18n.t('auth.pwHintNumber'))).toBeNull();
    fireEvent.changeText(screen.getByTestId('new-password-input'), 'Yenisifre');
    expect(screen.getByText(i18n.t('auth.pwHintNumber'))).toBeTruthy();
    expect(screen.queryByText(i18n.t('auth.pwHintUppercase'))).toBeNull();
    // Hepsi tamam → mesaj yok.
    fireEvent.changeText(screen.getByTestId('new-password-input'), 'Yenisifre1');
    expect(screen.queryByText(i18n.t('auth.pwHintNumber'))).toBeNull();
  });

  it('tekrar eşleşmezse satır içi hata, istek yok', async () => {
    fill('Eski1234!', 'Yeni1234!', 'Yeni1234?');
    expect(await screen.findByText(i18n.t('validation.passwordMatch'))).toBeTruthy();
    expect(mockChangePassword).not.toHaveBeenCalled();
  });

  it('kurala uymayan yeni şifre → eksik kural satır içi, istek yok', async () => {
    fill('Eski1234!', 'yeni12345', 'yeni12345');
    expect(await screen.findByText(i18n.t('auth.pwHintUppercase'))).toBeTruthy();
    expect(mockChangePassword).not.toHaveBeenCalled();
  });

  it('özel karakter ŞART DEĞİL: harf + rakam yeterli, istek gider', async () => {
    fill('Eski1234!', 'Yeni12345', 'Yeni12345');
    await waitFor(() => expect(mockChangePassword).toHaveBeenCalledWith('Eski1234!', 'Yeni12345'));
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
