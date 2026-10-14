/**
 * Hesabı sil ekranı (`settings/delete-account`, Profil > Hesabı Sil).
 * - Web `DangerZoneSection` gibi yazarak onay: "SİL" yazılmadan "Evet, Sil" kapalı.
 * - İstek sürerken ve başarıdan sonra kilitli (çift gönderim yok).
 * - Başarı: toast "Hesabınız silindi" → YALNIZ yerel çıkış (`reason: 'accountDeleted'`) → ana sayfa.
 * - Engel: başlık + her engel + izlenebilecek ekran yolları ekranda; çıkış yok.
 * - Silme başarılı ama çıkış düştü: yine başarı akışı, "Hesap silinemedi" YOK.
 */
import React from 'react';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils/render';
import { ToastHost } from '@/ui';
import { dismissToMock, pushMock, resetRouterMocks } from '@/test-utils/router-mock';

jest.mock('expo-router', () => require('@/test-utils/router-mock').routerMock);

const mockLogout = jest.fn((_opts?: unknown) => Promise.resolve());
let mockAuthenticated = true;
jest.mock('@/stores/authStore', () => ({
  useAuthStore: (sel?: (state: any) => unknown) => {
    const state: any = { isAuthenticated: mockAuthenticated, logout: mockLogout };
    return sel ? sel(state) : state;
  },
}));

jest.mock('@/lib/api', () => ({
  userApi: { deleteAccount: jest.fn() },
  errorText: jest.requireActual('@/lib/api/errorText').errorText,
}));
import { userApi } from '@/lib/api';

import DeleteAccountScreen from '../index';

const mockDelete = userApi.deleteAccount as jest.Mock;

const blocked = (details: Record<string, number>, errors: string[]) => ({
  response: {
    status: 400,
    data: {
      message: 'Hesabınızı silmek için aşağıdaki işlemleri tamamlamanız gerekmektedir:',
      i18nKey: 'server.user.deleteAccountBlocked',
      errors,
      details,
    },
  },
});

const renderScreen = () =>
  renderWithProviders(
    <>
      <DeleteAccountScreen />
      <ToastHost />
    </>,
  );

const submitButton = () => screen.getByTestId('delete-account-submit');
const isDisabled = () => submitButton().props.accessibilityState?.disabled === true;
const typeKeyword = (text: string) =>
  fireEvent.changeText(screen.getByTestId('delete-account-confirm-input'), text);
const press = () => act(async () => {
  fireEvent.press(submitButton());
});

beforeEach(() => {
  jest.clearAllMocks();
  resetRouterMocks();
  mockAuthenticated = true;
  mockLogout.mockImplementation(() => Promise.resolve());
});

describe('yazarak onay', () => {
  it('uyarı ve web metni gösterilir; "SİL" yazılmadan düğme kapalı', () => {
    renderScreen();
    expect(
      screen.getByText('Tüm verileriniz, ilanlarınız ve sipariş geçmişiniz kalıcı olarak silinecektir.'),
    ).toBeTruthy();
    expect(screen.getByText('Onaylamak için SİL yazın:')).toBeTruthy();
    expect(isDisabled()).toBe(true);
  });

  it('büyük/küçük harf duyarlı: "sil" ya da "SIL" açmaz, "SİL" açar', async () => {
    renderScreen();
    typeKeyword('sil');
    expect(isDisabled()).toBe(true);
    typeKeyword('SIL');
    expect(isDisabled()).toBe(true);
    await press();
    expect(mockDelete).not.toHaveBeenCalled();
    typeKeyword('SİL ');
    expect(isDisabled()).toBe(false);
  });
});

describe('başarı', () => {
  it('toast + yalnız yerel çıkış + ana sayfa', async () => {
    mockDelete.mockResolvedValue({ data: {} });
    renderScreen();
    typeKeyword('SİL');
    await press();

    expect(mockDelete).toHaveBeenCalledTimes(1);
    expect(mockLogout).toHaveBeenCalledWith({ reason: 'accountDeleted' });
    expect(dismissToMock).toHaveBeenCalledWith('/(tabs)');
    expect(await screen.findByText('Hesabınız silindi')).toBeTruthy();
  });

  it('istek sürerken kilitli: ikinci dokunuş ikinci istek atmaz, alan düzenlenemez', async () => {
    let resolve: (v: unknown) => void = () => {};
    mockDelete.mockReturnValue(new Promise((r) => (resolve = r)));
    renderScreen();
    typeKeyword('SİL');
    await press();
    await press();
    expect(mockDelete).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('delete-account-confirm-input').props.editable).toBe(false);
    expect(isDisabled()).toBe(true);

    await act(async () => resolve({ data: {} }));
    await waitFor(() => expect(dismissToMock).toHaveBeenCalledTimes(1));
    // Başarıdan sonra da kilitli kalır.
    await press();
    expect(mockDelete).toHaveBeenCalledTimes(1);
  });

  it('silme başarılı, çıkış düştü: yine başarı akışı; "Hesap silinemedi" yok', async () => {
    mockDelete.mockResolvedValue({ data: {} });
    mockLogout.mockImplementation(() => Promise.reject(new Error('SecureStore')));
    renderScreen();
    typeKeyword('SİL');
    await press();

    expect(dismissToMock).toHaveBeenCalledWith('/(tabs)');
    expect(await screen.findByText('Hesabınız silindi')).toBeTruthy();
    expect(screen.queryByText('Hesap silinemedi')).toBeNull();
    expect(screen.queryByTestId('delete-account-blockers')).toBeNull();
  });
});

describe('engel', () => {
  it('başlık + her engel + yollar; çıkış ve yönlendirme yok; yeniden denenebilir', async () => {
    mockDelete.mockRejectedValue(
      blocked({ activeProducts: 1, pendingOrders: 2, activeTrades: 0, openRefunds: 1 }, [
        '1 ilanınız süren bir satışa ya da takasa bağlı.',
        '2 bekleyen satın alım/satış işleminiz bulunmaktadır.',
        '1 açık iade süreciniz bulunmaktadır.',
      ]),
    );
    renderScreen();
    typeKeyword('SİL');
    await press();

    expect(screen.getByTestId('delete-account-blockers')).toBeTruthy();
    expect(screen.getByText('Hesap silinemez')).toBeTruthy();
    expect(
      screen.getByText('Hesabınızı silmek için aşağıdaki işlemleri tamamlamanız gerekmektedir:'),
    ).toBeTruthy();
    expect(screen.getByText('• 1 açık iade süreciniz bulunmaktadır.')).toBeTruthy();
    expect(mockLogout).not.toHaveBeenCalled();
    expect(dismissToMock).not.toHaveBeenCalled();

    // Rezerve ilan → Satışlarım; bekleyen sipariş → Siparişlerim; takas yok → yol yok.
    expect(screen.queryByTestId('delete-account-path-trades')).toBeNull();
    fireEvent.press(screen.getByTestId('delete-account-path-sales'));
    expect(pushMock).toHaveBeenCalledWith('/sales');
    fireEvent.press(screen.getByTestId('delete-account-path-orders'));
    expect(pushMock).toHaveBeenCalledWith('/orders');

    // Kilit açıldı: yeniden denenebilir.
    expect(isDisabled()).toBe(false);
  });

  it('ağ hatası: engel listesi yok, toast "Hesap silinemedi"', async () => {
    mockDelete.mockRejectedValue(new Error('Network Error'));
    renderScreen();
    typeKeyword('SİL');
    await press();

    expect(await screen.findByText('Hesap silinemedi')).toBeTruthy();
    expect(screen.queryByTestId('delete-account-blockers')).toBeNull();
    expect(mockLogout).not.toHaveBeenCalled();
  });
});

it('oturum yoksa giriş istenir', () => {
  mockAuthenticated = false;
  renderScreen();
  expect(screen.queryByTestId('delete-account-submit')).toBeNull();
});
