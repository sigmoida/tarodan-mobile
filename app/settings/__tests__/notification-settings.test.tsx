/**
 * B-1.11 · Bildirim ayarları kaydı hatayı yutmuyor.
 *
 * Eskiden `api.patch(...).catch(() => null)` başarısız kaydı başarıya çeviriyor
 * ve kullanıcı "Bildirim ayarları kaydedildi" görüyordu. Artık hata durumunda
 * sunucu mesajı (yoksa `settings.settingUpdateFailed`) gösterilir.
 */
import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';
import { appAlert } from '@/ui';

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

import NotificationSettingsScreen from '../notifications';

beforeEach(() => patch.mockReset());

const save = async () => {
  renderWithProviders(<NotificationSettingsScreen />);
  fireEvent.press(await screen.findByText('mobile.save'));
};

describe('B-1.11 · bildirim ayarları kaydı', () => {
  it('başarılı kayıt → "kaydedildi"', async () => {
    patch.mockResolvedValue({ data: {} });
    await save();
    await waitFor(() =>
      expect(appAlert).toHaveBeenCalledWith('common.success', 'settings.notificationSettingsSaved'),
    );
    expect(patch).toHaveBeenCalledWith('/users/me/settings', expect.any(Object));
  });

  it('sunucu hatası → hata gösterilir, "kaydedildi" DENMEZ', async () => {
    patch.mockRejectedValue({ response: { status: 500, data: {} } });
    await save();
    await waitFor(() =>
      expect(appAlert).toHaveBeenCalledWith('common.error', 'settings.settingUpdateFailed'),
    );
    expect(appAlert).not.toHaveBeenCalledWith(
      'common.success',
      'settings.notificationSettingsSaved',
    );
  });

  it('sunucu mesajı varsa o gösterilir', async () => {
    patch.mockRejectedValue({ response: { status: 400, data: { message: ['geçersiz alan'] } } });
    await save();
    await waitFor(() => expect(appAlert).toHaveBeenCalledWith('common.error', 'geçersiz alan'));
  });
});
