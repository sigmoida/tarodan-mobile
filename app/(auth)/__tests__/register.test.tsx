/**
 * J43 · Aynı email ile kayıt → backend "Bu email adresi zaten kayıtlı" mesajı UI'da gösterilir.
 * (Form mantığının mobil-UI yüzü; backend kuralı API e2e'de.)
 * birthDate jest.setup'taki EXPO_PUBLIC_MAESTRO=1 ile '1990-01-01' öndolu.
 */
import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';
import { routerMock, resetRouterMocks } from '@/test-utils/router-mock';

jest.mock('expo-router', () => require('@/test-utils/router-mock').routerMock);

jest.mock('@/lib/api', () => ({
  authApi: {
    register: jest.fn(),
    checkUsernameAvailability: jest.fn(() => Promise.resolve({ data: { available: true } })),
  },
}));
import { authApi } from '@/lib/api';
import RegisterScreen from '../register';

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

  it('başarılı kayıt login ekranına yönlendirir', async () => {
    mockRegister.mockResolvedValue({ data: { id: 'u1' } });
    renderWithProviders(<RegisterScreen />);
    fillValidFormExceptResult();
    fireEvent.press(screen.getByTestId('register-submit-button'));

    await waitFor(() => expect(mockRegister).toHaveBeenCalledTimes(1));
    expect(routerMock.router.replace).toHaveBeenCalledWith('/(auth)/login');
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
