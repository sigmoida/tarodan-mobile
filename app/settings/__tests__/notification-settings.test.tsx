/**
 * Bildirim ayarları — web `/profile` `NotificationsSection` ile aynı: aynı 6 anahtar aynı sırada,
 * Kaydet düğmesi yok, her anahtar değiştiği anda tek anahtarlık PATCH gider (iyimser, sıralı),
 * kuyruk boşalınca tek başarı toast'ı + sunucu doğrusu yeniden çekilir, hatada geri alınır.
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
const MKT = 'notification.marketingLabel';

beforeEach(() => {
  patch.mockReset();
  get.mockReset();
  get.mockResolvedValue({ data: { pushNotifications: true, marketingEmails: false } });
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

/** Elle çözülen istek (kuyruk sırasını denetlemek için). */
function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('bildirim ayarları · web ile aynı anahtarlar', () => {
  it('web sırasıyla 6 anahtar; SMS ve yeni ilan anahtarı çizilmez; Kaydet yok', async () => {
    await renderLoaded();
    const labels = screen.getAllByRole('switch').map((n) => n.props.accessibilityLabel);
    expect(labels).toEqual([
      'notification.emailEnableLabel',
      'notification.pushEnableLabel',
      'notification.orderUpdatesLabel',
      'notification.messagesLabel',
      'notification.priceDropLabel',
      'notification.marketingLabel',
    ]);
    expect(screen.queryByText('notification.smsLabel')).toBeNull();
    expect(screen.queryByText('notification.newListingsLabel')).toBeNull();
    expect(screen.queryByTestId('notification-settings-save')).toBeNull();
  });
});

describe('bildirim ayarları · anahtar başına otomatik kayıt (web paritesi)', () => {
  it('anahtar → tek anahtarlık PATCH, iyimser güncelleme, tek başarı toast; sunucu doğrusu çekilir', async () => {
    const success = jest.spyOn(toast, 'success').mockImplementation(() => 1);
    patch.mockResolvedValue({ data: { pushNotifications: true, marketingEmails: true } });
    const { queryClient } = await renderLoaded();
    expect(checked(MKT)).toBe(false);

    get.mockResolvedValue({ data: { pushNotifications: true, marketingEmails: true } });
    fireEvent.press(screen.getByLabelText(MKT));
    // İyimser: istek dönmeden önce açık görünür.
    await waitFor(() => expect(checked(MKT)).toBe(true));

    await waitFor(() => expect(success).toHaveBeenCalledWith('settings.settingUpdated'));
    expect(success).toHaveBeenCalledTimes(1);
    expect(patch).toHaveBeenCalledTimes(1);
    expect(patch).toHaveBeenCalledWith('/users/me/settings', { marketingEmails: true });
    expect(appAlert).not.toHaveBeenCalled();
    // Kuyruk boşalınca sorgu bir kez yeniden çekilir (ilk yükleme + 1).
    await waitFor(() => expect(get).toHaveBeenCalledTimes(2));
    expect(
      queryClient.getQueryData<{ marketingEmails?: boolean }>(qk.user.notificationSettings)?.marketingEmails,
    ).toBe(true);
    expect(checked(MKT)).toBe(true);
  });

  it('art arda dokunuşlar sıralı gider ve kuyruk boşalınca TEK başarı toast\'ı', async () => {
    const success = jest.spyOn(toast, 'success').mockImplementation(() => 1);
    const first = deferred<{ data: object }>();
    patch.mockReturnValueOnce(first.promise).mockResolvedValueOnce({ data: { pushNotifications: false, marketingEmails: true } });
    await renderLoaded();

    fireEvent.press(screen.getByLabelText(MKT));
    await waitFor(() => expect(checked(MKT)).toBe(true));
    fireEvent.press(screen.getByLabelText(PUSH));
    await waitFor(() => expect(checked(PUSH)).toBe(false));
    // İkinci yazma birincisi bitmeden gitmez (sunucu oku-birleştir-yaz).
    expect(patch).toHaveBeenCalledTimes(1);

    get.mockResolvedValue({ data: { pushNotifications: false, marketingEmails: true } });
    first.resolve({ data: { pushNotifications: true, marketingEmails: true } });
    await waitFor(() => expect(patch).toHaveBeenCalledTimes(2));
    expect(patch).toHaveBeenNthCalledWith(2, '/users/me/settings', { pushNotifications: false });
    await waitFor(() => expect(success).toHaveBeenCalledTimes(1));
    // Ara yanıt (push hâlâ açık) sıradaki iyimser değeri geri sıçratmaz.
    expect(checked(PUSH)).toBe(false);
    expect(checked(MKT)).toBe(true);
  });

  it('aynı anahtar kuyrukta düşerse son ONAYLI sunucu değerine döner, sunucu doğrusu çekilir', async () => {
    const error = jest.spyOn(toast, 'error').mockImplementation(() => 1);
    const success = jest.spyOn(toast, 'success').mockImplementation(() => 1);
    const first = deferred<{ data: object }>();
    patch.mockReturnValueOnce(first.promise).mockRejectedValueOnce({ response: { status: 500, data: {} } });
    await renderLoaded();

    fireEvent.press(screen.getByLabelText(MKT)); // false → true
    await waitFor(() => expect(checked(MKT)).toBe(true));
    fireEvent.press(screen.getByLabelText(MKT)); // true → false
    await waitFor(() => expect(checked(MKT)).toBe(false));

    get.mockResolvedValue({ data: { pushNotifications: true, marketingEmails: true } });
    first.reject({ response: { status: 500, data: {} } });
    await waitFor(() => expect(patch).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(get).toHaveBeenCalledTimes(2));
    // Sunucu doğrusu (true) kazanır; ara geri almalar değil.
    await waitFor(() => expect(checked(MKT)).toBe(true));
    expect(error).toHaveBeenCalledWith('settings.settingUpdateFailed', { id: 'notification-settings-error' });
    expect(success).not.toHaveBeenCalled();
  });

  it('kaydedilen değer yeniden açılışta (aynı önbellekle) görünür', async () => {
    jest.spyOn(toast, 'success').mockImplementation(() => 1);
    patch.mockResolvedValue({ data: { pushNotifications: false } });
    const { queryClient, unmount } = await renderLoaded();
    get.mockResolvedValue({ data: { pushNotifications: false } });
    fireEvent.press(screen.getByLabelText(PUSH));
    await waitFor(() => expect(patch).toHaveBeenCalledWith('/users/me/settings', { pushNotifications: false }));
    unmount();

    renderWithProviders(<NotificationSettingsScreen />, { queryClient });
    await screen.findByLabelText(PUSH);
    await waitFor(() => expect(checked(PUSH)).toBe(false));
  });

  it('sunucu hatası → değer geri alınır, hata toast olur, "güncellendi" DENMEZ', async () => {
    const error = jest.spyOn(toast, 'error').mockImplementation(() => 1);
    const success = jest.spyOn(toast, 'success').mockImplementation(() => 1);
    patch.mockRejectedValue({ response: { status: 500, data: {} } });
    await renderLoaded();

    fireEvent.press(screen.getByLabelText(MKT));
    await waitFor(() =>
      expect(error).toHaveBeenCalledWith('settings.settingUpdateFailed', expect.anything()),
    );
    await waitFor(() => expect(checked(MKT)).toBe(false));
    expect(success).not.toHaveBeenCalled();
    expect(appAlert).not.toHaveBeenCalled();
  });

  it('sunucu mesajı varsa o gösterilir', async () => {
    const error = jest.spyOn(toast, 'error').mockImplementation(() => 1);
    patch.mockRejectedValue({ response: { status: 400, data: { message: ['geçersiz alan'] } } });
    await renderLoaded();
    fireEvent.press(screen.getByLabelText(MKT));
    await waitFor(() => expect(error).toHaveBeenCalledWith('geçersiz alan', expect.anything()));
  });

  it('boş mesaj dizisi → yedek metin (boş uyarı gösterilmez)', async () => {
    const error = jest.spyOn(toast, 'error').mockImplementation(() => 1);
    patch.mockRejectedValue({ response: { status: 400, data: { message: [] } } });
    await renderLoaded();
    fireEvent.press(screen.getByLabelText(MKT));
    await waitFor(() =>
      expect(error).toHaveBeenCalledWith('settings.settingUpdateFailed', expect.anything()),
    );
  });
});

describe('bildirim ayarları yüklemesi', () => {
  it('GET düşerse ErrorState görünür (Kaydet adımından söz etmez), anahtarlar çizilmez ve PATCH gitmez', async () => {
    get.mockRejectedValue({ response: { status: 500, data: {} } });
    renderWithProviders(<NotificationSettingsScreen />);

    expect(await screen.findByText('settings.notificationPreferencesLoadFailed')).toBeTruthy();
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
