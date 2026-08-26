/**
 * settings/security telefon doğrulama — alan hiçbir ayrıştırıcıdan geçmiyordu.
 *
 * `useSecurity` düz `useState` tutuyor, `handleSendPhoneCode` girdiyi HAM olarak
 * `POST /auth/phone/send-code`'a veriyordu: ülke kodu seçici yok, biçim uyarısı
 * yok, sunucu reddedince kullanıcı nedenini göremiyordu. Diğer telefon
 * yollarıyla (checkout adresi, adresler, edit-profile) aynı sözleşme: gönderilen
 * değer E.164, çözülemeyen numara gönderimi durdurur ve Türkçe hata gösterir.
 */
import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';
import { PHONE_INVALID_MESSAGE } from '@/utils/phone';

jest.mock('expo-router', () => ({
  ...require('@/test-utils/router-mock').routerMock,
  useFocusEffect: jest.fn(),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

jest.mock('@/stores/authStore', () => ({
  useAuthStore: (sel?: (state: any) => unknown) => {
    const state: any = ({
    isAuthenticated: true,
    logout: jest.fn(),
    user: { displayName: 'Test', email: 't@b.com', phone: '', isPhoneVerified: false },
    refreshUserData: jest.fn(),
  });
    return sel ? sel(state) : state;
  },
}));

const mockSendPhoneCode = jest.fn(() => Promise.resolve({ data: {} }));
jest.mock('@/lib/api', () => ({
  authApi: {
    sendPhoneCode: (...args: unknown[]) => mockSendPhoneCode(...(args as [])),
    verifyPhone: jest.fn(() => Promise.resolve({ data: {} })),
    getTwoFactorStatus: jest.fn(() => Promise.resolve({ data: { isEnabled: false } })),
  },
}));

import SecurityScreen from '../security';

async function openPhoneDialog() {
  renderWithProviders(<SecurityScreen />);
  fireEvent.press(await screen.findByText('security.verify'));
}

beforeEach(() => {
  mockSendPhoneCode.mockClear();
});

describe('settings/security phone verification', () => {
  it('sends the number in E.164 form, not as typed', async () => {
    await openPhoneDialog();

    fireEvent.changeText(await screen.findByTestId('phone-input'), '0532 123 45 67');
    fireEvent.press(screen.getByText('security.sendCode'));

    await waitFor(() => expect(mockSendPhoneCode).toHaveBeenCalledWith('+905321234567'));
  });

  it('refuses to send a number it cannot resolve and says why', async () => {
    await openPhoneDialog();

    fireEvent.changeText(await screen.findByTestId('phone-input'), '05321234567890');
    fireEvent.press(screen.getByText('security.sendCode'));

    await waitFor(() => expect(screen.getByText(PHONE_INVALID_MESSAGE)).toBeTruthy());
    expect(mockSendPhoneCode).not.toHaveBeenCalled();
  });
});
