/**
 * Bildirim ayarları — web `/profile` `NotificationsSection` ile aynı: Kaydet düğmesi yok, her
 * anahtar değiştiği anda tek anahtarlık PATCH gider (iyimser), başarıda toast, hatada geri alınır.
 *
 * B-1.11: hata yutulmaz — başarısız yazma "güncellendi" demez, sunucu mesajı (yoksa
 * `settings.settingUpdateFailed`) gösterilir. Yükleme de hatayı yutmaz: GET düşerse varsayılanlar
 * gösterilip gerçek tercihlerin üzerine yazılmasın diye ErrorState + yeniden dene.
 */
import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';
import { appAlert, toast } from '@/ui';
import { qk } from '@/lib/query';

jest.mock('expo-router', () => require('@/test-utils/router-mock').routerMock);

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

jest.mock('@/stores/authStore', () => ({
  useAuthStore: (sel?: (state: any) => unknown) => {
    const state: any = { isAuthenticated: true };
    return sel ? sel(state) : state;
  },
}));

jest.mock('@/lib/api', () => ({
  api: {
    get: jest.fn(),
    patch: jest.fn(),
  },
}));
import { api } from '@/lib/api';
const patch = api.patch as jest.Mock;
const get = api.get as jest.Mock;

import NotificationSettingsScreen from '../notifications';

const PUSH = 'notification.pushEnableLabel';
const SMS = 'notification.smsLabel';

beforeEach(() => {
  patch.mockReset();
  get.mockReset();
  get.mockResolvedValue({ data: { pushNotifications: true, smsNotifications: false } });
});

afterEach(() => {
  jest.restoreAllMocks();
});

const checked = (label: string) => screen.getByLabelText(label).props.accessibilityState?.checked;

const renderLoaded = async () => {
  const utils = renderWithProviders(<NotificationSettingsScreen />);
  await screen.findByLabelText(PUSH);
  return utils;
};

describe('bildirim ayarları · anahtar başına otomatik kayıt (web paritesi)', () => {
  it('Kaydet düğmesi çizilmez', async () => {
    await renderLoaded();
    expect(screen.queryByTestId('notification-settings-save')).toBeNull();
    expect(screen.queryByText('mobile.save')).toBeNull();
  });

  it('anahtar → tek anahtarlık PATCH, iyimser güncelleme, başarı toast; yanıt önbelleğe yazılır', async () => {
    const success = jest.spyOn(toast, 'success').mockImplementation(() => 1);
    patch.mockResolvedValue({ data: { pushNotifications: true, smsNotifications: true } });
    const { queryClient } = await renderLoaded();
    expect(checked(SMS)).toBe(false);

    fireEvent.press(screen.getByLabelText(SMS));
    // İyimser: istek dönmeden önce açık görünür.
    await waitFor(() => expect(checked(SMS)).toBe(true));

    await waitFor(() => expect(success).toHaveBeenCalledWith('settings.settingUpdated'));
    expect(patch).toHaveBeenCalledTimes(1);
    expect(patch).toHaveBeenCalledWith('/users/me/settings', { smsNotifications: true });
    expect(appAlert).not.toHaveBeenCalled();
    expect(queryClient.getQueryData<{ smsNotifications?: boolean }>(qk.user.notificationSettings)?.smsNotifications).toBe(true);
    expect(checked(SMS)).toBe(true);
    success.mockRestore();
  });

  it('kaydedilen değer yeniden açılışta (aynı önbellekle) görünür', async () => {
    jest.spyOn(toast, 'success').mockImplementation(() => 1);
    patch.mockResolvedValue({ data: { pushNotifications: false } });
    const { queryClient, unmount } = await renderLoaded();
    fireEvent.press(screen.getByLabelText(PUSH));
    await waitFor(() => expect(patch).toHaveBeenCalledWith('/users/me/settings', { pushNotifications: false }));
    unmount();

    // Sunucu artık kaydedilmiş değeri döner.
    get.mockResolvedValue({ data: { pushNotifications: false } });
    renderWithProviders(<NotificationSettingsScreen />, { queryClient });
    await screen.findByLabelText(PUSH);
    await waitFor(() => expect(checked(PUSH)).toBe(false));
  });

  it('sunucu hatası → değer geri alınır, hata toast olur, "güncellendi" DENMEZ', async () => {
    const error = jest.spyOn(toast, 'error').mockImplementation(() => 1);
    const success = jest.spyOn(toast, 'success').mockImplementation(() => 1);
    patch.mockRejectedValue({ response: { status: 500, data: {} } });
    await renderLoaded();

    fireEvent.press(screen.getByLabelText(SMS));
    await waitFor(() => expect(error).toHaveBeenCalledWith('settings.settingUpdateFailed'));
    expect(checked(SMS)).toBe(false);
    expect(success).not.toHaveBeenCalled();
    expect(appAlert).not.toHaveBeenCalled();
    error.mockRestore();
    success.mockRestore();
  });

  it('sunucu mesajı varsa o gösterilir', async () => {
    const error = jest.spyOn(toast, 'error').mockImplementation(() => 1);
    patch.mockRejectedValue({ response: { status: 400, data: { message: ['geçersiz alan'] } } });
    await renderLoaded();
    fireEvent.press(screen.getByLabelText(SMS));
    await waitFor(() => expect(error).toHaveBeenCalledWith('geçersiz alan'));
    error.mockRestore();
  });

  it('boş mesaj dizisi → yedek metin (boş uyarı gösterilmez)', async () => {
    const error = jest.spyOn(toast, 'error').mockImplementation(() => 1);
    patch.mockRejectedValue({ response: { status: 400, data: { message: [] } } });
    await renderLoaded();
    fireEvent.press(screen.getByLabelText(SMS));
    await waitFor(() => expect(error).toHaveBeenCalledWith('settings.settingUpdateFailed'));
    error.mockRestore();
  });
});

describe('bildirim ayarları yüklemesi', () => {
  it('GET düşerse ErrorState görünür, anahtarlar çizilmez ve PATCH gitmez', async () => {
    get.mockRejectedValue({ response: { status: 500, data: {} } });
    renderWithProviders(<NotificationSettingsScreen />);

    expect(await screen.findByText('settings.notificationSettingsLoadFailed')).toBeTruthy();
    expect(screen.queryByLabelText(PUSH)).toBeNull();
    expect(patch).not.toHaveBeenCalled();
  });

  it('yeniden dene başarılı olunca ayarlar görünür ve anahtar kaydeder', async () => {
    jest.spyOn(toast, 'success').mockImplementation(() => 1);
    get.mockRejectedValueOnce({ response: { status: 500, data: {} } });
    renderWithProviders(<NotificationSettingsScreen />);

    fireEvent.press(await screen.findByText('mobile.errorRetry'));
    await screen.findByLabelText(PUSH);

    patch.mockResolvedValue({ data: {} });
    fireEvent.press(screen.getByLabelText(PUSH));
    await waitFor(() =>
      expect(patch).toHaveBeenCalledWith('/users/me/settings', { pushNotifications: false }),
    );
  });
});
