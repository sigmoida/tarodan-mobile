/**
 * B-1.11 · Bildirim ayarları kaydı hatayı yutmuyor.
 *
 * Eskiden `api.patch(...).catch(() => null)` başarısız kaydı başarıya çeviriyor
 * ve kullanıcı "Bildirim ayarları kaydedildi" görüyordu. Artık hata durumunda
 * sunucu mesajı (yoksa `settings.settingUpdateFailed`) gösterilir.
 *
 * Yükleme de hatayı yutmuyor: GET düşerse varsayılanlar gösterilip gerçek
 * tercihlerin üzerine yazılmasın diye ErrorState + yeniden dene, kaydetme kapalı.
 */
import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';
import { appAlert, toast } from '@/ui';

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
    get: jest.fn(() => Promise.resolve({ data: { pushNotifications: true } })),
    patch: jest.fn(),
  },
}));
import { api } from '@/lib/api';
const patch = api.patch as jest.Mock;
const get = api.get as jest.Mock;

import NotificationSettingsScreen from '../notifications';

beforeEach(() => {
  patch.mockReset();
  get.mockReset();
  get.mockResolvedValue({ data: { pushNotifications: true } });
});

const save = async () => {
  renderWithProviders(<NotificationSettingsScreen />);
  // Tercihler yüklenmeden kaydetme kapalı — önce yüklemeyi bekle.
  await waitFor(() =>
    expect(screen.getByTestId('notification-settings-save')).not.toBeDisabled(),
  );
  fireEvent.press(screen.getByText('mobile.save'));
};

describe('B-1.11 · bildirim ayarları kaydı', () => {
  it('başarılı kayıt → "kaydedildi" toast olur (diyalog değil)', async () => {
    const success = jest.spyOn(toast, 'success').mockImplementation(() => 1);
    patch.mockResolvedValue({ data: {} });
    await save();
    await waitFor(() => expect(success).toHaveBeenCalledWith('settings.notificationSettingsSaved'));
    expect(appAlert).not.toHaveBeenCalled();
    success.mockRestore();
    expect(patch).toHaveBeenCalledWith('/users/me/settings', expect.any(Object));
  });

  it('sunucu hatası → hata toast olur, "kaydedildi" DENMEZ', async () => {
    const error = jest.spyOn(toast, 'error').mockImplementation(() => 1);
    const success = jest.spyOn(toast, 'success').mockImplementation(() => 1);
    patch.mockRejectedValue({ response: { status: 500, data: {} } });
    await save();
    await waitFor(() => expect(error).toHaveBeenCalledWith('settings.settingUpdateFailed'));
    expect(success).not.toHaveBeenCalled();
    expect(appAlert).not.toHaveBeenCalled();
    error.mockRestore();
    success.mockRestore();
  });

  it('sunucu mesajı varsa o gösterilir', async () => {
    const error = jest.spyOn(toast, 'error').mockImplementation(() => 1);
    patch.mockRejectedValue({ response: { status: 400, data: { message: ['geçersiz alan'] } } });
    await save();
    await waitFor(() => expect(error).toHaveBeenCalledWith('geçersiz alan'));
    error.mockRestore();
  });
});

describe('hata metni · apiErrorMessage', () => {
  it('boş mesaj dizisi → yedek metin (boş uyarı gösterilmez)', async () => {
    const error = jest.spyOn(toast, 'error').mockImplementation(() => 1);
    patch.mockRejectedValue({ response: { status: 400, data: { message: [] } } });
    await save();
    await waitFor(() => expect(error).toHaveBeenCalledWith('settings.settingUpdateFailed'));
    error.mockRestore();
  });
});

describe('bildirim ayarları yüklemesi', () => {
  it('GET düşerse ErrorState görünür, Kaydet hiç çizilmez ve PATCH gitmez', async () => {
    get.mockRejectedValue({ response: { status: 500, data: {} } });
    renderWithProviders(<NotificationSettingsScreen />);

    expect(await screen.findByText('settings.notificationSettingsLoadFailed')).toBeTruthy();
    expect(screen.queryByTestId('notification-settings-save')).toBeNull();
    expect(patch).not.toHaveBeenCalled();
  });

  it('yeniden dene başarılı olunca ayarlar görünür ve kaydetme açılır', async () => {
    get.mockRejectedValueOnce({ response: { status: 500, data: {} } });
    renderWithProviders(<NotificationSettingsScreen />);

    fireEvent.press(await screen.findByText('mobile.errorRetry'));
    await waitFor(() =>
      expect(screen.queryByText('settings.notificationSettingsLoadFailed')).toBeNull(),
    );
    expect(screen.getByTestId('notification-settings-save')).not.toBeDisabled();

    patch.mockResolvedValue({ data: {} });
    fireEvent.press(screen.getByTestId('notification-settings-save'));
    await waitFor(() =>
      expect(patch).toHaveBeenCalledWith(
        '/users/me/settings',
        expect.objectContaining({ pushNotifications: true }),
      ),
    );
  });
});
