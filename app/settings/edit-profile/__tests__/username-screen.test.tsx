/**
 * Kullanıcı adı ekranı (`edit-profile/username`, Profili düzenle'deki satırdan).
 * - Belirlenmişse (çoğu hesap) yalnız salt okunur gösterim; form / Kaydet YOK.
 * - Yalnız `usernameClaimed === false` hesapta belirleme: debounced uygunluk,
 *   "bir kez belirlenir" uyarısı, appAlert onayı, alt çubuk Kaydet; başarıda geri dönülür.
 */
import React from 'react';
import { screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils/render';
import { appAlert, ToastHost } from '@/ui';
import { backMock, canGoBackMock, resetRouterMocks } from '@/test-utils/router-mock';

jest.mock('expo-router', () => require('@/test-utils/router-mock').routerMock);

const mockUpdateUser = jest.fn();
const mockRefreshUserData = jest.fn(() => Promise.resolve(null));
let mockUser: any;
jest.mock('@/stores/authStore', () => ({
  useAuthStore: (sel?: (state: any) => unknown) => {
    const state: any = {
      user: mockUser,
      updateUser: mockUpdateUser,
      refreshUserData: mockRefreshUserData,
    };
    return sel ? sel(state) : state;
  },
}));

jest.mock('@/lib/api', () => ({
  userApi: {
    claimUsername: jest.fn(() =>
      Promise.resolve({ data: { username: 'kaan.merakli', usernameClaimed: true } }),
    ),
  },
  authApi: { checkUsernameAvailability: jest.fn() },
  errorText: jest.requireActual('@/lib/api/errorText').errorText,
}));
import { userApi, authApi } from '@/lib/api';

import UsernameScreen from '../username';

const claim = userApi.claimUsername as jest.Mock;
const check = authApi.checkUsernameAvailability as jest.Mock;

const renderSection = () =>
  renderWithProviders(
    <>
      <UsernameScreen />
      <ToastHost />
    </>,
  );

const advance = (ms: number) => act(async () => { await jest.advanceTimersByTimeAsync(ms); });

/** Uygun ad: debounce + sorgu çözülür ve "uygun" satırı görünür (düğme açılır). */
const settleAvailable = async () => {
  await settleAvailability();
  await screen.findByText('Bu kullanıcı adı uygun');
};

/** Debounce (400 ms) + uygunluk sorgusunun çözülmesini bekler. */
const settleAvailability = () =>
  act(async () => {
    await jest.advanceTimersByTimeAsync(400);
    await jest.advanceTimersByTimeAsync(0);
  });

describe('Kullanıcı adı ekranı', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    resetRouterMocks();
    check.mockResolvedValue({ data: { available: true } });
    mockUser = { username: 'otomatik.ad', usernameClaimed: false };
  });
  afterEach(() => jest.useRealTimers());

  describe('belirlenmiş kullanıcı adı', () => {
    beforeEach(() => {
      mockUser = { username: 'kaan.merakli', usernameClaimed: true };
    });

    it('yalnız salt okunur satır + "değiştirilemez" notu gösterir, form yok', () => {
      renderSection();
      expect(screen.getByTestId('username-claimed')).toBeTruthy();
      expect(screen.getByText('@kaan.merakli')).toBeTruthy();
      expect(screen.getByText('Kullanıcı adı değiştirilemez')).toBeTruthy();
      expect(screen.queryByTestId('username-input')).toBeNull();
      expect(screen.queryByTestId('username-submit')).toBeNull();
      expect(screen.queryByTestId('username-permanent-warning')).toBeNull();
    });

    it('uygunluk ucuna hiç sorulmaz', async () => {
      renderSection();
      await advance(1000);
      expect(check).not.toHaveBeenCalled();
    });
  });

  it('kullanıcı adı yoksa ve bayrak bilinmiyorsa bölüm de form da çizilmez', () => {
    mockUser = {};
    renderSection();
    expect(screen.queryByTestId('edit-profile-username-section')).toBeNull();
    expect(screen.queryByTestId('username-submit')).toBeNull();
  });

  describe('belirlenebilir hesap', () => {
    it('kalıcı olduğu açıkça yazılır ve mevcut otomatik ad gösterilir', () => {
      renderSection();
      expect(screen.getByTestId('username-permanent-warning')).toBeTruthy();
      expect(screen.getByText('Şu an: @otomatik.ad (otomatik atandı)')).toBeTruthy();
    });

    it('geçersiz kullanıcı adı onaya bile gitmez', async () => {
      renderSection();
      fireEvent.changeText(screen.getByTestId('username-input'), 'aa');
      await settleAvailability();
      fireEvent.press(screen.getByTestId('username-submit'));
      await advance(0);
      expect(appAlert).not.toHaveBeenCalled();
      expect(claim).not.toHaveBeenCalled();
    });

    it('karışık büyük/küçük giriş alanda küçük harfe çevrilir ve öyle sorulur', async () => {
      renderSection();
      const input = screen.getByTestId('username-input');
      fireEvent.changeText(input, 'Kaan.Merakli');
      expect(input.props.value).toBe('kaan.merakli');
      await settleAvailability();
      expect(check).toHaveBeenCalledWith('kaan.merakli');
    });

    it('alınmış ad: hata satırı görünür, Kaydet kilitli, onay açılmaz', async () => {
      check.mockResolvedValue({ data: { available: false } });
      renderSection();
      fireEvent.changeText(screen.getByTestId('username-input'), 'alinmis.ad');
      await settleAvailability();

      await waitFor(() => expect(screen.getByText('Bu kullanıcı adı alınmış')).toBeTruthy());
      fireEvent.press(screen.getByTestId('username-submit'));
      await advance(0);
      expect(appAlert).not.toHaveBeenCalled();
      expect(claim).not.toHaveBeenCalled();
    });

    it('hesabın kendi otomatik adı sorulmadan uygun sayılır ve belirlenebilir', async () => {
      check.mockResolvedValue({ data: { available: false } }); // uç kendi adını "dolu" der
      renderSection();
      fireEvent.changeText(screen.getByTestId('username-input'), 'otomatik.ad');
      await settleAvailability();
      expect(check).not.toHaveBeenCalled();

      fireEvent.press(screen.getByTestId('username-submit'));
      await waitFor(() => expect(appAlert).toHaveBeenCalledTimes(1));
    });

    it('geçerli ad: önce appAlert onayı, onaydan sonra PATCH; başarıda store tazelenir + toast + geri', async () => {
      canGoBackMock.mockReturnValue(true);
      renderSection();
      fireEvent.changeText(screen.getByTestId('username-input'), 'kaan.merakli');
      await settleAvailable();
      fireEvent.press(screen.getByTestId('username-submit'));

      await waitFor(() => expect(appAlert).toHaveBeenCalledTimes(1));
      // Onay verilmeden mutasyon YOK.
      expect(claim).not.toHaveBeenCalled();
      const [title, body, buttons] = (appAlert as jest.Mock).mock.calls[0]!;
      expect(title).toBe('Kullanıcı adı kalıcı olacak');
      expect(body).toContain('@kaan.merakli');
      const confirm = buttons.find((b: any) => b.style !== 'cancel');
      confirm.onPress();

      await waitFor(() => expect(claim).toHaveBeenCalledWith('kaan.merakli'));
      await waitFor(() =>
        expect(mockUpdateUser).toHaveBeenCalledWith({
          username: 'kaan.merakli',
          usernameClaimed: true,
        }),
      );
      await waitFor(() => expect(mockRefreshUserData).toHaveBeenCalled());
      expect(await screen.findByText('Kullanıcı adınız kaydedildi.')).toBeTruthy();
      await waitFor(() => expect(backMock).toHaveBeenCalledTimes(1));
    });

    it('onay iptal edilirse mutasyon çalışmaz', async () => {
      renderSection();
      fireEvent.changeText(screen.getByTestId('username-input'), 'kaan.merakli');
      await settleAvailable();
      fireEvent.press(screen.getByTestId('username-submit'));
      await waitFor(() => expect(appAlert).toHaveBeenCalledTimes(1));
      const buttons = (appAlert as jest.Mock).mock.calls[0]![2];
      expect(buttons.find((b: any) => b.style === 'cancel')).toBeTruthy();
      // İptal düğmesine basılmadı / onPress yok → hiçbir şey gönderilmez.
      await advance(1000);
      expect(claim).not.toHaveBeenCalled();
    });

    it('sunucu 409 verirse hata alanın altında gösterilir (dialog açılmaz)', async () => {
      claim.mockRejectedValueOnce({
        response: { status: 409, data: { message: 'Bu kullanıcı adı zaten kullanılıyor' } },
      });
      renderSection();
      fireEvent.changeText(screen.getByTestId('username-input'), 'kaan.merakli');
      await settleAvailable();
      fireEvent.press(screen.getByTestId('username-submit'));
      await waitFor(() => expect(appAlert).toHaveBeenCalledTimes(1));
      (appAlert as jest.Mock).mock.calls[0]![2].find((b: any) => b.style !== 'cancel').onPress();

      expect(await screen.findByText('Bu kullanıcı adı zaten kullanılıyor')).toBeTruthy();
      expect(appAlert).toHaveBeenCalledTimes(1); // yalnız onay diyaloğu
      expect(mockUpdateUser).not.toHaveBeenCalled();
      expect(backMock).not.toHaveBeenCalled();
    });
  });
});
