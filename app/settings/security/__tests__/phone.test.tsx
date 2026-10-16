/**
 * Telefon doğrulama EKRANI (eski SecurityDialogs telefon diyaloğunun yerine).
 *
 * Sözleşme: gönderilen değer E.164; çözülemeyen numara gönderimi durdurur ve sebebi alanın altında
 * görünür (diğer telefon yollarıyla aynı metin); kod adımına geçince yeniden gönder geri sayımı;
 * doğrulama başarısı → kullanıcı tazelenir, geri dönülür, toast; hata → toast.error, ekran kalır;
 * kod adımında Android geri tuşu numara adımına döner.
 */
import React from 'react';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { toast } from '@/ui';
import { captureHardwareBack, renderWithProviders } from '@/test-utils';
import { backMock, canGoBackMock, resetRouterMocks } from '@/test-utils/router-mock';
import { getPhoneInvalidMessage } from '@/utils/phone';
import i18n from '@/i18n/config';

jest.mock('@/ui', () => {
  const actual = jest.requireActual('@/ui');
  return {
    ...actual,
    appAlert: jest.fn(),
    toast: Object.assign(jest.fn(), { success: jest.fn(), error: jest.fn(), dismiss: jest.fn() }),
  };
});

let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => {
  const { useEffect } = jest.requireActual('react');
  return {
    ...jest.requireActual('@/test-utils/router-mock').routerMock,
    useLocalSearchParams: () => mockParams,
    // Gerçek davranış: geri çağırım değişince (adım değişti) yeniden kaydolur.
    useFocusEffect: (cb: () => void | (() => void)) => useEffect(() => cb(), [cb]),
  };
});

const mockRefreshUserData = jest.fn(() => Promise.resolve(null));
let mockUser: Record<string, unknown> | null;
jest.mock('@/stores/authStore', () => ({
  useAuthStore: (sel?: (state: Record<string, unknown>) => unknown) => {
    const state: Record<string, unknown> = {
      isAuthenticated: true,
      profileValidated: true,
      user: mockUser,
      refreshUserData: mockRefreshUserData,
    };
    return sel ? sel(state) : state;
  },
}));

const mockSendPhoneCode = jest.fn((_phone: string) => Promise.resolve({ data: {} }));
const mockVerifyPhone = jest.fn((_code: string) => Promise.resolve({ data: {} }));
jest.mock('@/lib/api', () => ({
  authApi: {
    sendPhoneCode: (phone: string) => mockSendPhoneCode(phone),
    verifyPhone: (code: string) => mockVerifyPhone(code),
  },
}));

import PhoneVerificationScreen from '../phone';

const successMock = toast.success as jest.Mock;
const errorMock = toast.error as jest.Mock;
let hardwareBack: ReturnType<typeof captureHardwareBack>;

beforeEach(() => {
  mockParams = {};
  mockUser = { phone: '', isPhoneVerified: false };
  mockSendPhoneCode.mockClear();
  mockVerifyPhone.mockReset();
  mockVerifyPhone.mockResolvedValue({ data: {} });
  mockRefreshUserData.mockClear();
  successMock.mockClear();
  errorMock.mockClear();
  resetRouterMocks();
  hardwareBack = captureHardwareBack();
});

afterEach(() => hardwareBack.restore());

async function sendCode(phone = '0532 123 45 67') {
  renderWithProviders(<PhoneVerificationScreen />);
  fireEvent.changeText(await screen.findByTestId('phone-input'), phone);
  fireEvent.press(screen.getByTestId('phone-send-code'));
}

describe('settings/security/phone', () => {
  it('numarayı yazıldığı gibi değil E.164 olarak gönderir, kod adımına geçer', async () => {
    await sendCode();

    await waitFor(() => expect(mockSendPhoneCode).toHaveBeenCalledWith('+905321234567'));
    expect(await screen.findByTestId('phone-code-input')).toBeTruthy();
    expect(successMock).toHaveBeenCalledWith(i18n.t('profile.codeSent'));
    // Geri sayım başladı: yeniden gönder kapalı.
    expect(screen.getByTestId('phone-resend').props.accessibilityState).toMatchObject({ disabled: true });
  });

  it('çözülemeyen numarayı göndermez, sebebi alanın altında gösterir', async () => {
    await sendCode('05321234567890');

    expect(await screen.findByText(getPhoneInvalidMessage())).toBeTruthy();
    expect(mockSendPhoneCode).not.toHaveBeenCalled();
  });

  it('kayıtlı numara alanı doldurur (+90 tekrar yazılmaz)', async () => {
    mockUser = { phone: '+905551112233', isPhoneVerified: false };
    renderWithProviders(<PhoneVerificationScreen />);
    expect((await screen.findByTestId('phone-input')).props.value).toBe('555 111 22 33');
  });

  it('doğru kod: kullanıcı tazelenir, geri dönülür, başarı toast\'ı', async () => {
    canGoBackMock.mockReturnValue(true);
    await sendCode();
    fireEvent.changeText(await screen.findByTestId('phone-code-input'), '123456');
    fireEvent.press(screen.getByTestId('phone-verify-submit'));

    await waitFor(() => expect(backMock).toHaveBeenCalled());
    expect(mockVerifyPhone).toHaveBeenCalledWith('123456');
    expect(mockRefreshUserData).toHaveBeenCalled();
    expect(successMock).toHaveBeenCalledWith(i18n.t('profile.phoneVerified'));
  });

  it('kod alanı yalnız rakam alır; 6 hane olmadan doğrula kapalı', async () => {
    await sendCode();
    const input = await screen.findByTestId('phone-code-input');
    fireEvent.changeText(input, '12a3');
    expect(screen.getByTestId('phone-code-input').props.value).toBe('123');
    fireEvent.press(screen.getByTestId('phone-verify-submit'));
    expect(mockVerifyPhone).not.toHaveBeenCalled();
  });

  it('yanlış kod: toast.error (sunucu mesajı), ekran kalır', async () => {
    mockVerifyPhone.mockRejectedValue({ response: { data: { message: 'Kod geçersiz' } } });
    await sendCode();
    fireEvent.changeText(await screen.findByTestId('phone-code-input'), '000000');
    fireEvent.press(screen.getByTestId('phone-verify-submit'));

    await waitFor(() => expect(errorMock).toHaveBeenCalledWith('Kod geçersiz'));
    expect(backMock).not.toHaveBeenCalled();
    expect(screen.getByTestId('phone-code-input')).toBeTruthy();
  });

  it('kod adımında Android geri tuşu numara adımına döner (ekrandan çıkmaz)', async () => {
    await sendCode();
    await screen.findByTestId('phone-code-input');

    let consumed = false;
    act(() => {
      consumed = hardwareBack.press();
    });
    expect(consumed).toBe(true);
    expect(await screen.findByTestId('phone-input')).toBeTruthy();
    expect(backMock).not.toHaveBeenCalled();
  });

  describe('?verifyPhone= ile açılış', () => {
    it('kod o numaraya BİR kez gider, kod adımı açılır', async () => {
      mockParams = { verifyPhone: '+905321234567' };
      renderWithProviders(<PhoneVerificationScreen />);

      await waitFor(() => expect(mockSendPhoneCode).toHaveBeenCalledWith('+905321234567'));
      expect(await screen.findByTestId('phone-code-input')).toBeTruthy();
      expect(mockSendPhoneCode).toHaveBeenCalledTimes(1);
    });

    it('çözülemeyen parametre: kod gitmez, alanın altında geçersiz numara hatası', async () => {
      mockParams = { verifyPhone: '+1415555' };
      renderWithProviders(<PhoneVerificationScreen />);

      expect(await screen.findByText(getPhoneInvalidMessage())).toBeTruthy();
      expect(mockSendPhoneCode).not.toHaveBeenCalled();
    });
  });
});
