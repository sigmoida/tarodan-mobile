/**
 * J43 · Aynı email ile kayıt → backend "Bu email adresi zaten kayıtlı" mesajı UI'da gösterilir.
 * (Form mantığının mobil-UI yüzü; backend kuralı API e2e'de.)
 * birthDate jest.setup'taki EXPO_PUBLIC_MAESTRO=1 ile '1990-01-01' öndolu.
 */
import React from 'react';
import { act, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';
import { routerMock, resetRouterMocks, pushMock } from '@/test-utils/router-mock';

jest.mock('expo-router', () => require('@/test-utils/router-mock').routerMock);

jest.mock('@/lib/api', () => ({
  authApi: {
    register: jest.fn(),
    resendVerification: jest.fn(() => Promise.resolve({ data: {} })),
    checkUsernameAvailability: jest.fn(() => Promise.resolve({ data: { available: true } })),
  },
}));
import { authApi } from '@/lib/api';

jest.mock('@/services/googleSignin', () => ({
  signInWithGoogle: jest.fn(),
  isGoogleConfigured: () => true,
}));
jest.mock('@/services/appleSignin', () => ({
  signInWithApple: jest.fn(),
  isAppleAvailable: () => Promise.resolve(true),
}));
import RegisterScreen from '../register';
import { usePendingAuthEmailStore } from '@/stores/pendingAuthEmailStore';
import { useResendCooldownStore } from '@/stores/resendCooldownStore';

const mockRegister = authApi.register as jest.Mock;

function fillValidFormExceptResult() {
  // API 2026-07-30'dan beri username zorunlu — bkz. register/_lib/schema.ts.
  fireEvent.changeText(screen.getByTestId('register-username-input'), 'test.kullanici');
  fireEvent.changeText(screen.getByTestId('register-displayName-input'), 'Test Kullanıcı');
  fireEvent.changeText(screen.getByTestId('register-email-input'), 'dupe@demo.com');
  fireEvent.changeText(screen.getByTestId('register-password-input'), 'Demo1234');
  fireEvent.changeText(screen.getByTestId('register-confirmPassword-input'), 'Demo1234');
  fireEvent.press(screen.getByTestId('register-acceptTerms'));
  fireEvent.press(screen.getByTestId('register-acceptKvkk'));
  fireEvent(screen.getByTestId('register-birthDate-input'), 'onChange', '1990-01-01');
}

describe('J43 · aynı email ile kayıt reddi (register)', () => {
  beforeEach(() => {
    mockRegister.mockReset();
    resetRouterMocks();
    useResendCooldownStore.getState().reset();
    usePendingAuthEmailStore.setState({ email: null });
  });

  it('J43.2 backend "zaten kayıtlı" mesajını gösterir', async () => {
    mockRegister.mockRejectedValue({
      response: { data: { message: 'Bu email adresi zaten kayıtlı' } },
    });
    renderWithProviders(<RegisterScreen />);
    fillValidFormExceptResult();
    fireEvent.press(screen.getByTestId('register-submit-button'));

    await waitFor(() =>
      expect(screen.getByText('Bu email adresi zaten kayıtlı')).toBeOnTheScreen(),
    );
  });

  it('başarılı kayıt "Neredeyse Tamam!" durumunu gösterir (sessizce girişe gitmez)', async () => {
    mockRegister.mockResolvedValue({ data: { id: 'u1' } });
    renderWithProviders(<RegisterScreen />);
    fillValidFormExceptResult();
    fireEvent.press(screen.getByTestId('register-submit-button'));

    await waitFor(() => expect(screen.getByTestId('register-verify-sent')).toBeOnTheScreen());
    expect(routerMock.router.replace).not.toHaveBeenCalled();
    expect(screen.getByText('Neredeyse Tamam!')).toBeOnTheScreen();
    expect(screen.getByTestId('register-verify-email')).toHaveTextContent('dupe@demo.com');
    expect(screen.queryByTestId('register-submit-button')).toBeNull();

    fireEvent.press(screen.getByTestId('register-go-login-button'));
    expect(routerMock.router.dismissTo).toHaveBeenCalledWith('/(auth)/login');
    // E-posta URL'de değil bellekte taşınır (login + doğrulama ekranı oradan okur).
    expect(usePendingAuthEmailStore.getState().email).toBe('dupe@demo.com');
    fireEvent.press(screen.getByTestId('register-verify-later-link'));
    expect(pushMock).toHaveBeenCalledWith('/(auth)/verify-email');
  });

  it('tekrar gönder: ilk 60 sn kilitli (geri sayım), sonra e-postayla resend-verification çağırır', async () => {
    // Geri sayım aralığı kayıt anında kurulur → sahte saat baştan açık olmalı.
    jest.useFakeTimers();
    try {
      mockRegister.mockResolvedValue({ data: { id: 'u1' } });
      renderWithProviders(<RegisterScreen />);
      fillValidFormExceptResult();
      fireEvent.press(screen.getByTestId('register-submit-button'));
      await waitFor(() => expect(screen.getByTestId('register-resend-button')).toBeOnTheScreen());

      expect(screen.getByText('Tekrar gönder (60s)')).toBeOnTheScreen();
      fireEvent.press(screen.getByTestId('register-resend-button'));
      expect(authApi.resendVerification).not.toHaveBeenCalled();

      for (let i = 0; i < 60; i++) {
        act(() => {
          jest.advanceTimersByTime(1000);
        });
      }
      expect(screen.getByText('Doğrulama E-postasını Tekrar Gönder')).toBeOnTheScreen();
    } finally {
      jest.useRealTimers();
    }
    fireEvent.press(screen.getByTestId('register-resend-button'));
    await waitFor(() =>
      expect(authApi.resendVerification).toHaveBeenCalledWith('dupe@demo.com'),
    );
    // Başarılı gönderim geri sayımı yeniden kurar.
    await waitFor(() => expect(screen.getByText('Tekrar gönder (60s)')).toBeOnTheScreen());
  });

  it('B-2.3 kayıt gövdesi acceptedConsents taşır; yasal ad/TCKN gönderilmez', async () => {
    mockRegister.mockResolvedValue({ data: { id: 'u1' } });
    renderWithProviders(<RegisterScreen />);
    fillValidFormExceptResult();
    fireEvent.press(screen.getByTestId('register-submit-button'));

    await waitFor(() => expect(mockRegister).toHaveBeenCalledTimes(1));
    const body = mockRegister.mock.calls[0][0];
    expect(body.acceptedConsents).toEqual(['terms', 'privacy', 'kvkk']);
    expect(body).not.toHaveProperty('legalFirstName');
    expect(body).not.toHaveProperty('legalLastName');
    expect(body).not.toHaveProperty('nationalId');
  });

  it('B-2.3 KVKK kutusu işaretlenmeden kayıt gönderilmez', async () => {
    renderWithProviders(<RegisterScreen />);
    fillValidFormExceptResult();
    fireEvent.press(screen.getByTestId('register-acceptKvkk')); // işareti geri al
    fireEvent.press(screen.getByTestId('register-submit-button'));

    expect(await screen.findAllByText("KVKK Aydınlatma Metni'ni onaylamalısınız")).not.toHaveLength(0);
    expect(mockRegister).not.toHaveBeenCalled();
  });
});

describe('bireysel kayıt — düzen ve alanlar', () => {
  beforeEach(() => {
    mockRegister.mockReset();
    resetRouterMocks();
    useResendCooldownStore.getState().reset();
    usePendingAuthEmailStore.setState({ email: null });
  });

  it('başlık üst barda; içerikte büyük başlık/logo yok; sekmeler en üstte (Bireysel seçili)', () => {
    renderWithProviders(<RegisterScreen />);
    expect(screen.getByRole('header', { name: 'Hesap Oluştur' })).toBeOnTheScreen();
    expect(screen.getAllByText('Hesap Oluştur')).toHaveLength(1);
    expect(screen.queryByTestId('brand-logo')).toBeNull();
    expect(screen.getByTestId('register-tab-individual').props.accessibilityState.selected).toBe(true);
  });

  it('web sırası: Ad Soyad, kullanıcı adı (ipucu satırı yok), e-posta, telefon (+90) ve doğum tarihi, şifreler', () => {
    renderWithProviders(<RegisterScreen />);
    expect(screen.getByText(/^Ad Soyad/)).toBeOnTheScreen();
    expect(screen.queryByText(/Görünen Ad/)).toBeNull();
    expect(screen.getByPlaceholderText('Adınız Soyadınız')).toBeOnTheScreen();
    expect(screen.getByText(/Profil Kullanıcı Adı/)).toBeOnTheScreen();
    expect(screen.queryByText('Profil adresinizde kullanılır ve daha sonra değiştirilemez.')).toBeNull();
    expect(screen.getByTestId('register-phone-input')).toBeOnTheScreen();
    expect(screen.getByText('+90')).toBeOnTheScreen();
    expect(screen.getByTestId('register-birthDate-input')).toBeOnTheScreen();
    // Ayrı kural kartı YOK: şifre alanının altında yazarken yalnız eksik kurallar.
    expect(screen.queryByTestId('password-checklist')).toBeNull();
  });

  it('şifre alanının altında ANLIK yalnız eksik kural(lar); tamamsa mesaj yok', () => {
    renderWithProviders(<RegisterScreen />);
    expect(screen.queryByText('En az 1 rakam ekleyin')).toBeNull();
    fireEvent.changeText(screen.getByTestId('register-password-input'), 'Demoabcd');
    expect(screen.getByText('En az 1 rakam ekleyin')).toBeOnTheScreen();
    expect(screen.queryByText('En az 1 büyük harf ekleyin')).toBeNull();
    fireEvent.changeText(screen.getByTestId('register-password-input'), 'Demo1234');
    expect(screen.queryByText('En az 1 rakam ekleyin')).toBeNull();
  });

  it('T.C. Kimlik / Ad / Soyad bloğu YOK (kimlik ihtiyaç anında sorulur — App Store 5.1.1)', () => {
    renderWithProviders(<RegisterScreen />);
    expect(screen.queryByText(/T\.C\. Kimlik/i)).toBeNull();
    expect(screen.queryByText(/Yasal/i)).toBeNull();
  });

  it('onaylar: metin içi Kullanım Şartları / Gizlilik / KVKK bağlantıları ilgili sayfaya gider', () => {
    renderWithProviders(<RegisterScreen />);
    fireEvent.press(screen.getByText('Kullanım Şartları'));
    expect(pushMock).toHaveBeenCalledWith('/terms');
    fireEvent.press(screen.getByText('Gizlilik Politikası'));
    expect(pushMock).toHaveBeenCalledWith('/privacy');
    fireEvent.press(screen.getByTestId('register-kvkk-link'));
    expect(pushMock).toHaveBeenCalledWith('/privacy');
    expect(screen.getByTestId('register-acceptMarketing')).toBeOnTheScreen();
  });

  it('Google/Apple outline düğmeleri ve "Zaten hesabınız var mı? Giriş Yap" altta', async () => {
    renderWithProviders(<RegisterScreen />);
    expect(screen.getByTestId('register-google-button')).toBeOnTheScreen();
    await waitFor(() => expect(screen.getByTestId('register-apple-button')).toBeOnTheScreen());
    expect(screen.getByText(/Zaten hesabınız var mı\?/)).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('register-login-link'));
    expect(pushMock).toHaveBeenCalledWith('/(auth)/login');
  });

  it('telefon +90 önekli biçimlenir ve E.164 olarak gönderilir; pazarlama izni taşınır', async () => {
    mockRegister.mockResolvedValue({ data: { id: 'u1' } });
    renderWithProviders(<RegisterScreen />);
    fillValidFormExceptResult();
    fireEvent.changeText(screen.getByTestId('register-phone-input'), '5321234567');
    expect(screen.getByTestId('register-phone-input').props.value).toBe('532 123 45 67');
    fireEvent.press(screen.getByTestId('register-acceptMarketing'));
    fireEvent.press(screen.getByTestId('register-submit-button'));

    await waitFor(() => expect(mockRegister).toHaveBeenCalledTimes(1));
    const body = mockRegister.mock.calls[0][0];
    expect(body.phone).toBe('+905321234567');
    expect(body.acceptsMarketingEmails).toBe(true);
  });

  it('telefon boşsa gönderilmez; pazarlama izni varsayılan kapalı', async () => {
    mockRegister.mockResolvedValue({ data: { id: 'u1' } });
    renderWithProviders(<RegisterScreen />);
    fillValidFormExceptResult();
    fireEvent.press(screen.getByTestId('register-submit-button'));

    await waitFor(() => expect(mockRegister).toHaveBeenCalledTimes(1));
    const body = mockRegister.mock.calls[0][0];
    expect(body).not.toHaveProperty('phone');
    expect(body.acceptsMarketingEmails).toBe(false);
  });

  it('geçersiz telefon alan altında hata verir, kayıt gönderilmez', async () => {
    renderWithProviders(<RegisterScreen />);
    fillValidFormExceptResult();
    fireEvent.changeText(screen.getByTestId('register-phone-input'), '12345');
    fireEvent.press(screen.getByTestId('register-submit-button'));
    await waitFor(() => expect(screen.getByText('Geçerli bir telefon numarası girin')).toBeOnTheScreen());
    expect(mockRegister).not.toHaveBeenCalled();
  });
});
