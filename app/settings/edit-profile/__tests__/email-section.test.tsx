/**
 * Profili düzenle · e-posta bölümü: aynı kartta satır içi adımlar (modal yok).
 * idle (e-posta + doğrulama durumu + "Değiştir") → entering (yeni e-posta → "Kod gönder")
 * → codeSent (6 haneli kod, "Doğrula", 60 sn "Tekrar gönder", "E-postayı düzelt", "Vazgeç").
 * (Eski `settings/email-change` ekran testlerinin senaryoları buraya taşındı.)
 */
import React from 'react';
import { StyleSheet } from 'react-native';
import { screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils/render';
import { appAlert, ToastHost, theme } from '@/ui';

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
  authApi: {
    requestEmailChange: jest.fn(() => Promise.resolve({ data: { message: 'ok' } })),
    verifyEmailChange: jest.fn(() => Promise.resolve({ data: { email: 'yeni@ornek.com' } })),
  },
  errorText: jest.requireActual('@/lib/api/errorText').errorText,
}));
import { authApi } from '@/lib/api';

import { EmailSection } from '../_sections/EmailSection';

const requestChange = authApi.requestEmailChange as jest.Mock;
const verifyChange = authApi.verifyEmailChange as jest.Mock;

const advance = (ms: number) =>
  act(async () => {
    await jest.advanceTimersByTimeAsync(ms);
  });

/** Düğmenin (Pressable) düzleştirilmiş stili. */
const btnStyle = (testID: string) => {
  const style = screen.getByTestId(testID).props.style;
  return StyleSheet.flatten(typeof style === 'function' ? style({ pressed: false }) : style);
};

const renderSection = () =>
  renderWithProviders(
    <>
      <EmailSection />
      <ToastHost />
    </>,
  );

/** idle → entering → (yeni e-posta yaz, kod iste) → codeSent. */
async function goToCodeStep() {
  fireEvent.press(screen.getByTestId('edit-profile-email-change-toggle'));
  fireEvent.changeText(screen.getByTestId('email-change-input'), 'yeni@ornek.com');
  fireEvent.press(screen.getByTestId('email-change-request'));
  await screen.findByTestId('email-change-code');
}

describe('Profili düzenle · e-posta bölümü', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockUser = { email: 'eski@ornek.com', isEmailVerified: true };
  });
  afterEach(() => jest.useRealTimers());

  it('idle: mevcut e-posta + doğrulama durumu + "Değiştir"; eski "destek" yardım metni yok', () => {
    renderSection();
    expect(screen.getByText('eski@ornek.com')).toBeTruthy();
    expect(screen.getByText('Doğrulandı')).toBeTruthy();
    expect(screen.getByTestId('edit-profile-email-change-toggle')).toBeTruthy();
    expect(screen.queryByTestId('email-change-input')).toBeNull();
    expect(screen.queryByText(/destek ile iletişime/)).toBeNull();
  });

  it('doğrulanmamış e-posta uyarı rozetiyle gösterilir', () => {
    mockUser = { email: 'eski@ornek.com', isEmailVerified: false };
    renderSection();
    expect(screen.getByText('E-posta doğrulanmadı')).toBeTruthy();
  });

  it('"Değiştir" aynı kartta yeni e-posta alanını açar; "Vazgeç" geri kapatır', () => {
    renderSection();
    fireEvent.press(screen.getByTestId('edit-profile-email-change-toggle'));
    expect(screen.getByTestId('email-change-input')).toBeTruthy();
    expect(screen.queryByTestId('edit-profile-email-change-toggle')).toBeNull();

    fireEvent.press(screen.getByTestId('email-change-cancel'));
    expect(screen.queryByTestId('email-change-input')).toBeNull();
    expect(screen.getByTestId('edit-profile-email-change-toggle')).toBeTruthy();
  });

  it('e-posta adımı: "Kod gönder" birincil (dolu), "Vazgeç" outline (ButtonRow)', () => {
    renderSection();
    fireEvent.press(screen.getByTestId('edit-profile-email-change-toggle'));
    expect(btnStyle('email-change-request')).toMatchObject({ backgroundColor: theme.colors.primary[600] });
    expect(btnStyle('email-change-cancel')).toMatchObject({
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: theme.colors.border.DEFAULT,
    });
  });

  it('kod adımı: "Doğrula" birincil, "Vazgeç" outline; "Tekrar gönder"/"E-postayı düzelt" metin düğmesi', async () => {
    renderSection();
    await goToCodeStep();
    expect(btnStyle('email-change-verify')).toMatchObject({ backgroundColor: theme.colors.primary[600] });
    expect(btnStyle('email-change-cancel')).toMatchObject({ backgroundColor: 'transparent', borderWidth: 1 });
    expect(btnStyle('email-change-resend').borderWidth).toBe(0);
    expect(btnStyle('email-change-fix').borderWidth).toBe(0);
    expect(screen.getAllByTestId('email-change-cancel')).toHaveLength(1);
  });

  it('geçersiz e-posta gönderilmez, hata alanın altında', async () => {
    renderSection();
    fireEvent.press(screen.getByTestId('edit-profile-email-change-toggle'));
    fireEvent.changeText(screen.getByTestId('email-change-input'), 'gecersiz');
    fireEvent.press(screen.getByTestId('email-change-request'));
    await advance(0);
    expect(requestChange).not.toHaveBeenCalled();
    expect(screen.queryByTestId('email-change-code')).toBeNull();
  });

  it('geçerli e-posta ile kod istenir ve kod adımına geçilir (toast)', async () => {
    renderSection();
    await goToCodeStep();
    expect(requestChange).toHaveBeenCalledWith('yeni@ornek.com');
    expect(screen.getByText('yeni@ornek.com adresine gönderilen 6 haneli kodu girin.')).toBeTruthy();
    expect(await screen.findByText('Doğrulama kodu yeni e-postanıza gönderildi')).toBeTruthy();
  });

  it('6 haneden kısa kod doğrulamaya gönderilmez', async () => {
    renderSection();
    await goToCodeStep();
    fireEvent.changeText(screen.getByTestId('email-change-code'), '123');
    fireEvent.press(screen.getByTestId('email-change-verify'));
    await advance(0);
    expect(verifyChange).not.toHaveBeenCalled();
  });

  it('kod yalnız rakam kabul eder', async () => {
    renderSection();
    await goToCodeStep();
    const input = screen.getByTestId('email-change-code');
    fireEvent.changeText(input, '12a3-4');
    expect(input.props.value).toBe('1234');
  });

  it('doğru kod: store e-posta + isEmailVerified ile güncellenir, tazelenir, toast, bölüm idle olur', async () => {
    renderSection();
    await goToCodeStep();
    fireEvent.changeText(screen.getByTestId('email-change-code'), '123456');
    fireEvent.press(screen.getByTestId('email-change-verify'));

    await waitFor(() => expect(verifyChange).toHaveBeenCalledWith('123456'));
    await waitFor(() =>
      expect(mockUpdateUser).toHaveBeenCalledWith({
        email: 'yeni@ornek.com',
        isEmailVerified: true,
      }),
    );
    await waitFor(() => expect(mockRefreshUserData).toHaveBeenCalled());
    expect(await screen.findByText('E-posta adresiniz güncellendi')).toBeTruthy();
    expect(screen.queryByTestId('email-change-code')).toBeNull();
    expect(screen.getByTestId('edit-profile-email-change-toggle')).toBeTruthy();
    expect(appAlert).not.toHaveBeenCalled();
  });

  it('yanlış kod: hata kod alanının altında, dialog yok, adım korunur', async () => {
    verifyChange.mockRejectedValueOnce({
      response: { status: 400, data: { message: 'Kod hatalı veya süresi dolmuş' } },
    });
    renderSection();
    await goToCodeStep();
    fireEvent.changeText(screen.getByTestId('email-change-code'), '000000');
    fireEvent.press(screen.getByTestId('email-change-verify'));

    expect(await screen.findByText('Kod hatalı veya süresi dolmuş')).toBeTruthy();
    expect(screen.getByTestId('email-change-code')).toBeTruthy();
    expect(mockUpdateUser).not.toHaveBeenCalled();
    expect(appAlert).not.toHaveBeenCalled();
  });

  it('başka hesapta kayıtlı e-posta (409): hata yeni e-posta alanının altında', async () => {
    requestChange.mockRejectedValueOnce({
      response: { status: 409, data: { message: 'Bu e-posta başka bir hesapta kayıtlı' } },
    });
    renderSection();
    fireEvent.press(screen.getByTestId('edit-profile-email-change-toggle'));
    fireEvent.changeText(screen.getByTestId('email-change-input'), 'dolu@ornek.com');
    fireEvent.press(screen.getByTestId('email-change-request'));

    expect(await screen.findByText('Bu e-posta başka bir hesapta kayıtlı')).toBeTruthy();
    expect(screen.queryByTestId('email-change-code')).toBeNull();
    expect(appAlert).not.toHaveBeenCalled();
  });

  describe('tekrar gönder sayacı', () => {
    it('60 sn geri sayım bitene kadar kapalı; sonra aynı adrese yeniden istek', async () => {
      renderSection();
      await goToCodeStep();
      expect(requestChange).toHaveBeenCalledTimes(1);
      expect(screen.getByText('Tekrar gönder (60s)')).toBeTruthy();

      // Sayaç bitmeden basış etkisiz.
      fireEvent.press(screen.getByTestId('email-change-resend'));
      await advance(0);
      expect(requestChange).toHaveBeenCalledTimes(1);

      await advance(30_000);
      expect(screen.getByText('Tekrar gönder (30s)')).toBeTruthy();

      await advance(30_000);
      expect(screen.getByText('Kodu tekrar gönder')).toBeTruthy();
      fireEvent.press(screen.getByTestId('email-change-resend'));
      await waitFor(() => expect(requestChange).toHaveBeenCalledTimes(2));
      expect(requestChange).toHaveBeenLastCalledWith('yeni@ornek.com');
      // İstek başarılı → sayaç yeniden başlar.
      expect(await screen.findByText('Tekrar gönder (60s)')).toBeTruthy();
    });

    it('sunucu cooldown hatası verirse kod alanının altında gösterilir', async () => {
      renderSection();
      await goToCodeStep();
      await advance(60_000);
      requestChange.mockRejectedValueOnce({
        response: { status: 400, data: { message: 'Çok sık istek, biraz bekleyin' } },
      });
      fireEvent.press(screen.getByTestId('email-change-resend'));
      expect(await screen.findByText('Çok sık istek, biraz bekleyin')).toBeTruthy();
    });
  });

  it('"E-postayı düzelt": kod adımından yeni e-posta alanına döner, yazılan adres korunur', async () => {
    renderSection();
    await goToCodeStep();
    fireEvent.press(screen.getByTestId('email-change-fix'));

    expect(screen.queryByTestId('email-change-code')).toBeNull();
    expect(screen.getByTestId('email-change-input').props.value).toBe('yeni@ornek.com');
  });

  it('kod adımında "Vazgeç": bölüm idle olur, mevcut e-posta aynen kalır', async () => {
    renderSection();
    await goToCodeStep();
    fireEvent.press(screen.getByTestId('email-change-cancel'));

    expect(screen.queryByTestId('email-change-code')).toBeNull();
    expect(screen.getByText('eski@ornek.com')).toBeTruthy();
    expect(verifyChange).not.toHaveBeenCalled();
  });
});
